"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDemoUser } from "@/components/demo/demo-user-provider";
import {
  createSocialPostFromUpload,
  socialReviewSeedPosts,
  type NewSocialPostInput,
  type SocialReviewPost,
} from "@/lib/mock-social-review";

type SocialPostsContextValue = {
  posts: SocialReviewPost[];
  addPost: (input: NewSocialPostInput) => SocialReviewPost;
  updatePost: (
    postId: number,
    updater: (post: SocialReviewPost) => SocialReviewPost,
  ) => void;
};

const SocialPostsContext = createContext<SocialPostsContextValue | null>(null);
const STORAGE_KEY_PREFIX = "workspace-social-posts";

export function SocialPostsProvider({ children }: { children: ReactNode }) {
  const { demoMode, currentUser } = useDemoUser();
  const activeUserKey = demoMode ? currentUser?.id ?? "unselected" : "auth";
  const storageKey = `${STORAGE_KEY_PREFIX}:${activeUserKey}`;
  const [posts, setPosts] = useState<SocialReviewPost[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (activeUserKey === "unselected") {
      setPosts([]);
      setHydrated(false);
      return;
    }

    try {
      const saved = window.localStorage.getItem(storageKey);

      if (saved) {
        const parsed = JSON.parse(saved) as SocialReviewPost[];
        setPosts(parsed);
      } else {
        setPosts(socialReviewSeedPosts);
      }
    } catch {
      setPosts(socialReviewSeedPosts);
    } finally {
      setHydrated(true);
    }
  }, [activeUserKey, storageKey]);

  useEffect(() => {
    if (!hydrated || activeUserKey === "unselected") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(posts));
  }, [activeUserKey, hydrated, posts, storageKey]);

  const value = useMemo<SocialPostsContextValue>(() => {
    return {
      posts,
      addPost: (input) => {
        if (activeUserKey === "unselected") {
          throw new Error("Cannot add social posts without an active workspace user.");
        }

        const nextId = posts.length > 0 ? Math.max(...posts.map((post) => post.id)) + 1 : 1;
        const created = createSocialPostFromUpload(input, nextId);
        setPosts((previous) => [created, ...previous]);
        return created;
      },
      updatePost: (postId, updater) => {
        setPosts((previous) =>
          previous.map((post) => (post.id === postId ? updater(post) : post)),
        );
      },
    };
  }, [activeUserKey, posts]);

  return <SocialPostsContext.Provider value={value}>{children}</SocialPostsContext.Provider>;
}

export function useSocialPosts() {
  const context = useContext(SocialPostsContext);

  if (!context) {
    throw new Error("useSocialPosts must be used within a SocialPostsProvider.");
  }

  return context;
}
