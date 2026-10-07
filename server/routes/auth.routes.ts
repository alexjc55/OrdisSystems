import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated, requireAdmin } from "../middleware/auth-guard";
import { hashPassword, comparePasswords } from "../password-hash";
import { PasswordUpdateConflict } from "../session-credentials";

const router = Router();

async function destroyAffectedSession(req: any, userId: string) {
  if (req.user?.id !== userId) return;
  // Prevent express-session from saving this request's deleted session again.
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((error: Error | null) => error ? reject(error) : resolve());
  });
  req.user = undefined;
}

router.get('/auth/user', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    if (userId === '__superadmin__') {
      return res.json(req.user);
    }
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

router.get('/auth/my-branches', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    if (userId === '__superadmin__') {
      return res.json([]); // superadmin sees all branches
    }
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === 'admin') {
      res.json([]); // empty = all branches
    } else {
      const branchIds = await storage.getUserBranches(userId);
      res.json(branchIds);
    }
  } catch (error) {
    console.error("Error fetching user branches:", error);
    res.status(500).json({ message: "Failed to fetch user branches" });
  }
});

router.post('/auth/change-password', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ message: "Новый пароль должен содержать минимум 6 символов" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (user.password) {
      if (typeof currentPassword !== "string" || !currentPassword) {
        return res.status(400).json({ message: "Необходимо указать текущий пароль" });
      }
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Неверный текущий пароль" });
      }
    }

    const hashedPassword = await hashPassword(newPassword);
    await storage.updatePassword(userId, hashedPassword, { expectedPassword: user.password });
    await destroyAffectedSession(req, userId);

    res.json({ message: "Пароль успешно изменен" });
  } catch (error) {
    if (error instanceof PasswordUpdateConflict) {
      return res.status(409).json({ message: "Пароль уже изменён. Войдите заново" });
    }
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Ошибка при изменении пароля" });
  }
});

router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email) {
      return res.status(400).json({ message: "Email обязателен" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.json({ message: "Если пользователь с таким email существует, инструкции отправлены на почту" });
    }

    await storage.createPasswordResetToken(email);

    res.json({ message: "Если пользователь с таким email существует, инструкции отправлены на почту" });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    res.status(500).json({ message: "Ошибка при запросе сброса пароля" });
  }
});

router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (typeof token !== "string" || !token || typeof newPassword !== "string" || !newPassword) {
      return res.status(400).json({ message: "Токен и новый пароль обязательны" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Пароль должен содержать минимум 6 символов" });
    }

    const { userId, isValid } = await storage.validatePasswordResetToken(token);
    if (!isValid) {
      return res.status(400).json({ message: "Недействительный или истекший токен" });
    }

    const hashedPassword = await hashPassword(newPassword);
    await storage.updatePassword(userId, hashedPassword, { resetToken: token });
    await destroyAffectedSession(req, userId);

    res.json({ message: "Пароль успешно сброшен" });
  } catch (error) {
    if (error instanceof PasswordUpdateConflict) {
      return res.status(400).json({ message: "Недействительный или истекший токен" });
    }
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Ошибка при сбросе пароля" });
  }
});

router.post('/admin/users/:id/set-password', requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Пароль должен содержать минимум 6 символов" });
    }

    if (!await storage.getUser(id)) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    const hashedPassword = await hashPassword(password);
    await storage.updatePassword(id, hashedPassword);
    await destroyAffectedSession(req, id);

    res.json({ message: "Пароль успешно установлен" });
  } catch (error) {
    console.error("Error setting user password:", error);
    res.status(500).json({ message: "Ошибка при установке пароля" });
  }
});

export default router;
