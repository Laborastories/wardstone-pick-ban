import { HttpError } from 'wasp/server'
import type { OnAfterSignupHook } from 'wasp/server/auth'

export const onAfterSignup: OnAfterSignupHook = async ({
  providerId,
  user,
  prisma,
}) => {
  if (providerId.providerName === 'discord' && !user.email) {
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    })
    throw new HttpError(403, 'Discord user needs a valid email to sign up')
  }
}
