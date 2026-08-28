import { useState, useEffect } from "react";
import { SidebarTrigger, useSidebar } from "@workspace/ui/components/sidebar";
import { Settings, Key, MessageSquare, Eye, EyeOff, Check, X, Loader2, Trash2, RotateCcw, GlobeIcon, User, Palette, Menu, LogIn } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { toast } from "sonner";
import { PROVIDERS, TAVILY_PROVIDER } from "@/lib/providers";
import { useApiKeys, useSaveApiKey, useDeleteApiKey, useValidateApiKey, useUserSettings, useUpdateUserSettings } from "@/hooks/use-settings";
import type { ApiKeyInfo } from "@/lib/api-types";
import { authClient, useSession } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Kbd } from "@workspace/ui/components/kbd";
import { useNavigate } from "@tanstack/react-router";
import { getLocalDb } from "@/lib/localdb";
import { localUser } from "@/lib/schema.local";

// ─── Account Section ───
function AccountSection() {
  const { data: session, isPending } = useSession();
  const [name, setName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
     

  // Desktop: load user from local SQLite
  const [localUserInfo, setLocalUserInfo] = useState<{
    id: string; name: string; email: string; image: string | null;
  } | null>(null);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    const loadLocalUser = async () => {
      try {
        const { getLocalDb } = await import("@/lib/localdb");
        const { localUser } = await import("@/lib/schema.local");
        const { eq } = await import("drizzle-orm");
        const db = await getLocalDb();
        const [user] = await db.select().from(localUser).where(eq(localUser.isLoggedIn, true));
        if (user) {
          setLocalUserInfo(user);
          setName(user.name);
        }
      } catch (e) {
        console.error("Failed to load local user for settings:", e);
      } finally {
        setLocalLoading(false);
      }
    };
    loadLocalUser();
  }, []);

  // Update local state when web session loads
  useEffect(() => {
    if (session?.user && !name && !isPending && !isUpdating) {
      setName(session.user.name || "");
    }
  }, [session, name, isPending, isUpdating]);

  const handleUpdate = async () => {
    if (!name.trim()) return;
    setIsUpdating(true);
    try {
      await authClient.updateUser({
        name: name.trim()
      });
      const db = await getLocalDb();
      await db.update(localUser).set({
       name:name.trim()
      })
      toast.success("Profile updated");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };


  if (localLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Determine user from either source
  const user = localUserInfo 

  // Guest mode — show sign-in CTA
  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Account</h3>
          <p className="text-sm text-muted-foreground">Sign in to sync your data across devices and access cloud features.</p>
        </div>
        <Separator />
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h4 className="text-sm font-medium">You&apos;re using foldex as a guest</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Your data is stored locally on this device. Sign in to enable cloud sync and access your notes from anywhere.
            </p>
          </div>
          <Button onClick={() => navigate({to:"/signin"})} className="cursor-pointer gap-2">
            <LogIn className="h-4 w-4" />
            Sign in or Create Account
          </Button>
        </div>
      </div>
    );
  }

  const initials = user.name ? user.name.substring(0, 2).toUpperCase() : "U";
  const avatarUrl = user.image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}&radius=10`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">Manage your account details and preferences.</p>
      </div>
      <Separator />
      
      <div className="flex items-center gap-6">
        <Avatar className="h-20 w-20 rounded-xl shadow-sm border border-border">
          <AvatarImage src={avatarUrl} alt={user.name} />
          <AvatarFallback className="rounded-xl text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h4 className="text-sm font-medium">Profile Picture</h4>
          <p className="text-xs text-muted-foreground mt-1">Generated automatically from your name.</p>
        </div>
      </div>

      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Name
          </label>
          <div className="flex gap-2">
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Your name"
            />
            <Button onClick={handleUpdate} disabled={isUpdating || name === user.name} className="cursor-pointer">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Email
          </label>
          <Input 
            value={user.email} 
            disabled 
            className="bg-muted/50 cursor-not-allowed text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">Your email address cannot be changed.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Preferences Section ───
function PreferencesSection() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">Customize the look and feel of the application.</p>
      </div>
      <Separator />
      
      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Theme Preference</label>
          <p className="text-xs text-muted-foreground mb-3">Select your preferred color theme.</p>
          <p className="text-xs text-muted-foreground">did you know? you can change theme by pressing  <Kbd>d</Kbd> key in keyboard !</p>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 p-4 hover:bg-accent transition-all cursor-pointer",
                theme === "light" ? "border-primary bg-primary/5" : "border-muted"
              )}
            >
              <div className="w-full h-12 rounded-md bg-white border border-slate-200 shadow-sm mb-2 flex flex-col p-1 gap-1">
                <div className="w-full h-3 bg-slate-100 rounded-sm"></div>
                <div className="w-1/2 h-2 bg-slate-100 rounded-sm"></div>
              </div>
              <span className="text-xs font-medium">Light</span>
            </button>
            
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 p-4 hover:bg-accent transition-all cursor-pointer",
                theme === "dark" ? "border-primary bg-primary/5" : "border-muted"
              )}
            >
              <div className="w-full h-12 rounded-md bg-slate-950 border border-slate-800 shadow-sm mb-2 flex flex-col p-1 gap-1">
                <div className="w-full h-3 bg-slate-800 rounded-sm"></div>
                <div className="w-1/2 h-2 bg-slate-800 rounded-sm"></div>
              </div>
              <span className="text-xs font-medium">Dark</span>
            </button>
            
            <button
              onClick={() => setTheme("system")}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 p-4 hover:bg-accent transition-all cursor-pointer",
                theme === "system" ? "border-primary bg-primary/5" : "border-muted"
              )}
            >
              <div className="w-full h-12 rounded-md bg-gradient-to-br from-white to-slate-950 border border-slate-300 shadow-sm mb-2 flex flex-col p-1 gap-1">
                <div className="w-full h-3 bg-slate-400 rounded-sm mix-blend-difference"></div>
                <div className="w-1/2 h-2 bg-slate-400 rounded-sm mix-blend-difference"></div>
              </div>
              <span className="text-xs font-medium">System</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Provider Key Card ───
function ProviderKeyCard({
  providerId,
  providerName,
  description,
  placeholder,
  icon,
  existingKey,
}: {
  providerId: string;
  providerName: string;
  description: string;
  placeholder: string;
  icon?: string;
  existingKey?: ApiKeyInfo;
}) {
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);

  const { mutateAsync: saveKey, isPending: isSaving } = useSaveApiKey();
  const { mutateAsync: deleteKey, isPending: isDeleting } = useDeleteApiKey();
  const { mutateAsync: validateKey, isPending: isValidating } = useValidateApiKey();

  const handleSave = async () => {
    if (!keyValue.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    try {
      await saveKey({ provider: providerId, key: keyValue.trim() });
      toast.success(`${providerName} key saved`);
      setKeyValue("");
      setShowKey(false);
    } catch {
      toast.error(`Failed to save ${providerName} key`);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteKey(providerId);
      toast.success(`${providerName} key removed`);
    } catch {
      toast.error(`Failed to remove ${providerName} key`);
    }
  };

  const handleValidate = async () => {
    try {
      const result = await validateKey(providerId);
      if (result.valid) {
        toast.success(`${providerName} key is valid ✓`);
      } else {
        toast.error(result.error || `${providerName} key is invalid`);
      }
    } catch {
      toast.error(`Failed to validate ${providerName} key`);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon && (
            <img src={icon} alt={providerName} className="h-6 w-6" />
          )}
          <div>
            <h4 className="text-sm font-semibold text-foreground">{providerName}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {existingKey && (
          <div className="flex items-center gap-1.5">
            {existingKey.isValid ? (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Check className="h-3 w-3" /> Valid
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <X className="h-3 w-3" /> Invalid
              </span>
            )}
          </div>
        )}
      </div>

      {existingKey ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-mono flex-1">
              {existingKey.displayHint}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleValidate}
                disabled={isValidating}
                className="h-7 px-2 text-xs cursor-pointer"
              >
                {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-7 px-2 text-xs text-destructive hover:text-destructive cursor-pointer"
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {/* Replace key */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                placeholder={`Replace with new ${placeholder}`}
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                className="pr-8 text-sm h-8"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !keyValue.trim()}
              className="h-8 cursor-pointer"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Update"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              placeholder={placeholder}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              className="pr-8 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !keyValue.trim()}
            className="cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── API Keys Section ───
function ApiKeysSection() {
  const { data: apiKeys,isLoading:isapiloading } = useApiKeys();
  const getKeyForProvider = (providerId: string): ApiKeyInfo | undefined => {
    return apiKeys?.find((k) => k.provider === providerId);
  };
  if (isapiloading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">API Keys</h3>
        <p className="text-sm text-muted-foreground">Manage your connections to external AI and search providers.</p>
      </div>
      <Separator />
      
      <div className="space-y-4">
        {PROVIDERS.map((provider) => (
          <ProviderKeyCard
            key={provider.id}
            providerId={provider.id}
            providerName={provider.name}
            description={provider.description}
            placeholder={provider.placeholder}
            icon={provider.icon}
            existingKey={getKeyForProvider(provider.id)}
          />
        ))}

        <div className="pt-4 flex items-center gap-2 mb-2">
          <GlobeIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Web Search</h3>
        </div>
        <ProviderKeyCard
          providerId={TAVILY_PROVIDER.id}
          providerName={TAVILY_PROVIDER.name}
          description={TAVILY_PROVIDER.description}
          placeholder={TAVILY_PROVIDER.placeholder}
          existingKey={getKeyForProvider(TAVILY_PROVIDER.id)}
        />
      </div>
    </div>
  );
}

// ─── System Prompt Section ───
function SystemPromptSection() {
  const { data: settings, isLoading } = useUserSettings();
  const { mutateAsync: updateSettings, isPending } = useUpdateUserSettings();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const currentPrompt = prompt ?? settings?.systemPrompt ?? "";
  const defaultPrompt = settings?.defaultSystemPrompt ?? "";
  const isCustom = currentPrompt !== "" && currentPrompt !== defaultPrompt;

  const handleSave = async () => {
    try {
      await updateSettings({ systemPrompt: currentPrompt || null });
      toast.success("System prompt saved");
      setIsEditing(false);
    } catch {
      toast.error("Failed to save system prompt");
    }
  };

  const handleReset = async () => {
    try {
      await updateSettings({ systemPrompt: null });
      setPrompt(null);
      toast.success("System prompt reset to default");
      setIsEditing(false);
    } catch {
      toast.error("Failed to reset system prompt");
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">System Prompt</h3>
        <p className="text-sm text-muted-foreground">Customize how the AI behaves and responds to your queries.</p>
      </div>
      <Separator />
      
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Global Instructions
            </h4>
            <p className="text-xs text-muted-foreground">
              {isCustom ? "Using custom prompt" : "Using default prompt"}
            </p>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPrompt(currentPrompt);
                setIsEditing(true);
              }}
              className="cursor-pointer"
            >
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2 pt-2">
            <textarea
              value={prompt ?? ""}
              onChange={(e) => setPrompt(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter your custom system prompt..."
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {(prompt ?? "").length} characters
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPrompt(null);
                    setIsEditing(false);
                  }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/50 p-4 mt-2 border border-border/50">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {currentPrompt || defaultPrompt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Settings Component ───
export default function SettingsComponent() {
  const [activeTab, setActiveTab] = useState<"account" | "apikeys" | "preferences" | "prompt">("account");
  
  const navItems = [
    { id: "account", label: "Account", icon: User },
    { id: "apikeys", label: "API Keys", icon: Key },
    { id: "preferences", label: "Appearance", icon: Palette },
    { id: "prompt", label: "System Prompt", icon: MessageSquare },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-background rounded-xl overflow-hidden w-full">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h1 className="font-semibold text-lg">Settings</h1>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden max-w-6xl mx-auto w-full">
        {/* Left Sidebar Navigation */}
        <aside className="w-64 border-r bg-muted/10 hidden md:block overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                    activeTab === item.id 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile Horizontal Navigation (Fallback for small screens) */}
        <div className="md:hidden border-b overflow-x-auto scrollbar-hidden bg-muted/10">
          <div className="flex p-2 gap-1 min-w-max">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                  activeTab === item.id 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12">
          <div className="max-w-3xl mx-auto">
            {activeTab === "account" && <AccountSection />}
            {activeTab === "apikeys" && <ApiKeysSection />}
            {activeTab === "preferences" && <PreferencesSection />}
            {activeTab === "prompt" && <SystemPromptSection />}
          </div>
        </main>
      </div>
    </div>
  );
}
