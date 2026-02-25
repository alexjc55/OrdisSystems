import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth-guard";
import { scryptAsync } from "../utils/app-hash";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

const router = Router();

router.get('/auth/user', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

router.post('/auth/change-password', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Новый пароль должен содержать минимум 6 символов" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Необходимо указать текущий пароль" });
      }
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Неверный текущий пароль" });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await storage.updatePassword(userId, hashedPassword);

    res.json({ message: "Пароль успешно изменен" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Ошибка при изменении пароля" });
  }
});

router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email обязателен" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.json({ message: "Если пользователь с таким email существует, инструкции отправлены на почту" });
    }

    const { token } = await storage.createPasswordResetToken(email);
    console.log(`Password reset token for ${email}: ${token}`);

    res.json({ message: "Если пользователь с таким email существует, инструкции отправлены на почту" });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    res.status(500).json({ message: "Ошибка при запросе сброса пароля" });
  }
});

router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Токен и новый пароль обязательны" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Пароль должен содержать минимум 6 символов" });
    }

    const { userId, isValid } = await storage.validatePasswordResetToken(token);
    if (!isValid) {
      return res.status(400).json({ message: "Недействительный или истекший токен" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await storage.updatePassword(userId, hashedPassword);

    res.json({ message: "Пароль успешно сброшен" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Ошибка при сбросе пароля" });
  }
});

router.post('/admin/users/:id/set-password', isAuthenticated, async (req: any, res) => {
  try {
    const adminUserId = req.user.id;
    const adminUser = await storage.getUser(adminUserId);

    if (!adminUser || (adminUser.role !== "admin" && adminUser.email !== "alexjc55@gmail.com" && adminUser.username !== "admin")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Пароль должен содержать минимум 6 символов" });
    }

    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const hashedPassword = `${buf.toString("hex")}.${salt}`;
    await storage.updatePassword(id, hashedPassword);

    res.json({ message: "Пароль успешно установлен" });
  } catch (error) {
    console.error("Error setting user password:", error);
    res.status(500).json({ message: "Ошибка при установке пароля" });
  }
});

export default router;
