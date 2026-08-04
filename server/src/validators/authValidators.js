const { z } = require('zod');

// Matches authController.register: { name, email, password }
const registerSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128),
  }),
};

// Matches authController.login: { email, password }
const loginSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
};

module.exports = { registerSchema, loginSchema };
