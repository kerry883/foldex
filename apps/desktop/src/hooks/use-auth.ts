import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/query-keys";

export function useSession() {
  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: async () => {
      const session = await authClient.getSession();
      return session.data;
    },
    staleTime: 1000 * 60 * 5, // session stays fresh for 5 minutes
  });
}

export function useSendOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (res.error) throw new Error(res.error.message);
      return res;
    },
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const res = await authClient.signIn.emailOtp({ email, otp });
      if (res.error) throw new Error(res.error.message);
      return res;
    },
    onSuccess: () => {
      // refresh session after sign in
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      // clear everything from cache on sign out
      queryClient.clear();
    },
  });
}