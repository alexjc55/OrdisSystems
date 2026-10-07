import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, type Request } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { toPublicUser } from "@shared/user-dto";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { hashPassword, comparePasswords } from "./password-hash";
import { SESSION_TABLE_NAME, sessionIdentity, type SessionIdentity } from "./session-credentials";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const SUPER_ADMIN_ID = "__superadmin__";

function getSuperAdminUser(): SelectUser {
  return {
    id: SUPER_ADMIN_ID,
    username: process.env.SUPER_ADMIN_LOGIN || "superadmin",
    email: null,
    password: null,
    firstName: "Super",
    lastName: "Admin",
    phone: null,
    role: "admin",
    createdAt: new Date(),
    loyaltyPoints: 0,
    pushSubscription: null,
    pushNotificationsEnabled: false,
    marketingNotificationsEnabled: false,
  } as unknown as SelectUser;
}

function isSuperAdminCredentials(username: string, password: string): boolean {
  const login = process.env.SUPER_ADMIN_LOGIN;
  const pwd = process.env.SUPER_ADMIN_PASSWORD;
  if (!login || !pwd) return false;
  return username === login && password === pwd;
}

export function setupAuth(app: Express) {
  const PostgresSessionStore = connectPg(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "eDAHouse-secret-key-for-sessions",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({ 
      pool, 
      tableName: SESSION_TABLE_NAME,
      createTableIfMissing: false
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use((req, _res, next) => {
    // Upgrade legacy id-only sessions before any route can save them again.
    // A request in flight during password rotation retains the old fingerprint.
    const authSession = (req.session as any)?.passport;
    if (req.user && req.user.id !== SUPER_ADMIN_ID && typeof authSession?.user === "string") {
      authSession.user = sessionIdentity(req.user);
    }
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username.toLowerCase());
        if (!user || !user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null,
    user.id === SUPER_ADMIN_ID ? user.id : sessionIdentity(user)
  ));
  passport.deserializeUser(async (req: Request, identity: string | SessionIdentity, done: (error: any, user?: SelectUser | false) => void) => {
    try {
      const id = typeof identity === "string" ? identity : identity?.id;
      if (id === SUPER_ADMIN_ID) {
        return done(null, getSuperAdminUser());
      }
      if (typeof id !== "string") return done(null, false);
      const user = typeof identity === "string"
        ? await storage.getUserForLegacySession(id, req.sessionID)
        : await storage.getUser(id);
      if (!user || (typeof identity !== "string" &&
        identity.passwordVersion !== sessionIdentity(user).passwordVersion)) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password, firstName, lastName, phone, claimToken } = req.body;
      
      const existingUser = await storage.getUserByUsername(username.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: "Имя пользователя уже занято" });
      }

      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email уже зарегистрирован" });
        }
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username: username.toLowerCase(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: "customer",
      });

      req.login(user, async (err) => {
        if (err) return next(err);
        
        let claimedOrder = null;
        if (claimToken && typeof claimToken === 'string') {
          try {
            claimedOrder = await storage.claimGuestOrder(claimToken, user.id);
            if (claimedOrder) {
              console.log(`Successfully claimed order ${claimedOrder.id} for new user ${user.id}`);
            }
          } catch (claimError) {
            console.error("Error claiming guest order during registration:", claimError);
          }
        }
        
        res.status(201).json({ 
          ...toPublicUser(user),
          claimedOrderId: claimedOrder?.id || null 
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Ошибка регистрации" });
    }
  });

  // Super-admin login intercept — checked before Passport
  app.post("/api/login", async (req, res, next) => {
    const { username, password } = req.body;
    if (isSuperAdminCredentials(username, password)) {
      const superAdmin = getSuperAdminUser();
      req.login(superAdmin, (err) => {
        if (err) return next(err);
        return res.status(200).json(toPublicUser(superAdmin));
      });
      return;
    }
    next();
  }, passport.authenticate("local"), (req, res) => {
    res.status(200).json(toPublicUser(req.user!));
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json(toPublicUser(req.user!));
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export { hashPassword, comparePasswords };
