import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './mongodb';
import User from './models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please provide email and password');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email.toLowerCase() });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          teamName: user.teamName,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.teamName = (user as any).teamName;
        token.isAdmin = (user as any).isAdmin;
      }

      // Fetch fresh user data from database to get latest completedLevels and currentLevel
      // This ensures middleware always has up-to-date level progress
      if (token.id) {
        try {
          await connectDB();
          const dbUser = await User.findById(token.id).select('completedLevels currentLevel isAdmin');

          if (dbUser) {
            token.completedLevels = dbUser.completedLevels;
            token.currentLevel = dbUser.currentLevel;
            token.isAdmin = dbUser.isAdmin;
          }
        } catch (error) {
          console.error('Error fetching user data in JWT callback:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.teamName = token.teamName as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.completedLevels = token.completedLevels as string[];
        session.user.currentLevel = token.currentLevel as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
