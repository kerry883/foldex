import * as localApiKeys from "@/lib/services/localapikeys";
import * as localUserSettings from "@/lib/services/localusersettings";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiKeyInfo, UserSettings } from "@/lib/api-types";

// ─── API Keys ───

export const useApiKeys = () => {
  return useQuery({
    queryKey: queryKeys.settings.keys,
    queryFn: async () =>(await localApiKeys.getApiKeysMeta()) as unknown as ApiKeyInfo[],
  });
};

export const useSaveApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider, key }: { provider: string; key: string }) => {
        // Save the key using the localApiKeys service which handles Stronghold and metadata
        return (await localApiKeys.saveApiKeyMeta(provider, key)) as unknown as ApiKeyInfo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.keys });
    },
  });
};

export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (provider: string) => {
        return (await localApiKeys.deleteApiKeyMeta(provider)) as unknown as {success: boolean};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.keys });
    },
  });
};

export const useValidateApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (provider: string) => {
        return localApiKeys.validateLocalApiKey(provider);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.keys });
    },
  });
};

// ─── User Settings ───

export const useUserSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings.userSettings,
    queryFn: async () =>(await localUserSettings.getUserSettings()) as unknown as UserSettings,
  });
};

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { systemPrompt?: string | null }) =>(await localUserSettings.updateUserSettings(data)) as unknown as UserSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.userSettings });
    },
  });
};