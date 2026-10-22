// Signed-in user's profile: display name and photo.
// Photos: either a Storage upload under avatars/{userId}/… or a built-in preset:id.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  isPresetPath,
  presetDataUrl,
  presetIdFromPath,
} from "@/lib/preset-avatars";

export type Profile = { displayName: string | null; avatarUrl: string | null; avatarPath: string | null };

const EVENT = "stellun:profile-changed";

async function resolveAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (isPresetPath(path)) {
    return presetDataUrl(presetIdFromPath(path));
  }
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
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
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_path")
      .eq("user_id", userId)
      .maybeSingle();
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
      if (file.size > 2 * 1024 * 1024) return "Please choose an image under 2 MB.";
      const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) {
        // Common: bucket missing or RLS. Surface a clearer hint.
        const msg = error.message || "";
        if (/bucket|not found|row-level/i.test(msg)) {
          return "Upload storage is not ready. Pick a STELLUN avatar below, or ask admin to enable the avatars bucket.";
        }
        return "The photo could not be uploaded. Please try again.";
      }
      const { error: e2 } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, avatar_path: path }, { onConflict: "user_id" });
      if (e2) return "The photo could not be saved. Please try again.";
      window.dispatchEvent(new Event(EVENT));
      return null;
    },
    [userId],
  );

  const selectPreset = useCallback(
    async (presetId: string): Promise<string | null> => {
      if (!userId) return "Please sign in first.";
      const path = `preset:${presetId}`;
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, avatar_path: path }, { onConflict: "user_id" });
      if (error) return "That avatar could not be saved. Please try again.";
      window.dispatchEvent(new Event(EVENT));
      return null;
    },
    [userId],
  );

  const saveName = useCallback(
    async (name: string): Promise<string | null> => {
      if (!userId) return "Please sign in first.";
      const clean = name.trim().slice(0, 60) || null;
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, display_name: clean }, { onConflict: "user_id" });
      if (error) return "Your name could not be saved. Please try again.";
      window.dispatchEvent(new Event(EVENT));
      return null;
    },
    [userId],
  );

  return { profile, uploadAvatar, selectPreset, saveName };
}
