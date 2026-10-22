// Signed-in profile: display name + avatar (upload or preset:id).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  isPresetPath,
  presetDataUrl,
  presetIdFromPath,
} from "@/lib/preset-avatars";

export type Profile = {
  displayName: string | null;
  avatarUrl: string | null;
  avatarPath: string | null;
};

const EVENT = "stellun:profile-changed";

async function resolveAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (isPresetPath(path)) {
    return presetDataUrl(presetIdFromPath(path));
  }
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<Profile>({
    displayName: null,
    avatarUrl: null,
    avatarPath: null,
  });

  const load = useCallback(async () => {
    if (!userId) {
      setProfile({ displayName: null, avatarUrl: null, avatarPath: null });
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_path")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[profile] load failed", error.message);
    }
    const path = data?.avatar_path ?? null;
    setProfile({
      displayName: data?.display_name ?? null,
      avatarPath: path,
      avatarUrl: await resolveAvatarUrl(path),
    });
  }, [userId]);

  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, [load]);

  const uploadAvatar = useCallback(
    async (file: File): Promise<string | null> => {
      if (!userId) return "Please sign in first.";
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        return "Please choose a PNG, JPEG or WebP image.";
      }
      // Soft limit for mobile — bucket may allow more
      if (file.size > 5 * 1024 * 1024) return "Please choose an image under 5 MB.";

      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `${userId}/avatar.${ext}`;

      // Remove any previous file variants so the path stays stable
      await supabase.storage.from("avatars").remove([
        `${userId}/avatar.png`,
        `${userId}/avatar.jpg`,
        `${userId}/avatar.jpeg`,
        `${userId}/avatar.webp`,
      ]);

      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (upErr) {
        console.warn("[profile] upload", upErr);
        return `Upload failed: ${upErr.message}`;
      }

      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert(
          { user_id: userId, avatar_path: path, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      if (dbErr) {
        console.warn("[profile] upsert after upload", dbErr);
        return `Saved to storage but profile update failed: ${dbErr.message}. Run the profiles migration in Supabase if needed.`;
      }

      window.dispatchEvent(new Event(EVENT));
      return null;
    },
    [userId],
  );

  const selectPreset = useCallback(
    async (presetId: string): Promise<string | null> => {
      if (!userId) return "Please sign in first.";
      const path = `preset:${presetId}`;
      const { error } = await supabase.from("profiles").upsert(
        { user_id: userId, avatar_path: path, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (error) {
        console.warn("[profile] preset", error);
        return `Could not save avatar: ${error.message}. Check that the profiles table exists and RLS allows your user.`;
      }
      // Optimistic UI: set immediately, then reload
      setProfile((p) => ({
        ...p,
        avatarPath: path,
        avatarUrl: presetDataUrl(presetId),
      }));
      window.dispatchEvent(new Event(EVENT));
      return null;
    },
    [userId],
  );

  const saveName = useCallback(
    async (name: string): Promise<string | null> => {
      if (!userId) return "Please sign in first.";
      const clean = name.trim().slice(0, 60) || null;
      const { error } = await supabase.from("profiles").upsert(
        { user_id: userId, display_name: clean, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (error) return `Name not saved: ${error.message}`;
      window.dispatchEvent(new Event(EVENT));
      return null;
    },
    [userId],
  );

  return { profile, uploadAvatar, selectPreset, saveName };
}
