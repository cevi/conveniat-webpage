import { startNativeAppLogin } from '@/features/next-auth/utils/native-app-login';

export const GET = (request: Request): Response => startNativeAppLogin(request);
