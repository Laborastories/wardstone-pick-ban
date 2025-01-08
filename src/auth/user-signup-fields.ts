/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineUserSignupFields } from 'wasp/auth/providers/types'
import { z } from "zod";

const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []

const discordDataSchema = z.object({
  profile: z.object({
    username: z.string(),
    email: z.string().email().nullable(),
  }),
});

export const getDiscordUserFields = defineUserSignupFields({
  email: (data: any) => data.profile.email,
  username: (data) => {
    const discordData = discordDataSchema.parse(data);
    return discordData.profile.username;
  },
  isAdmin: (data) => {
    const email = discordDataSchema.parse(data).profile.email;
    return !!email && adminEmails.includes(email);
  },
});

export function getDiscordAuthConfig() {
  return {
    scopes: ["identify", "email"],
  };
}
