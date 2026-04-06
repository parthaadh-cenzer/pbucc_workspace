"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
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

export function SocialPostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<SocialReviewPost[]>(socialReviewSeedPosts);

  const value = useMemo<SocialPostsContextValue>(() => {
    return {
      posts,
      addPost: (input) => {
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
  }, [posts]);

  return <SocialPostsContext.Provider value={value}>{children}</SocialPostsContext.Provider>;
}

export function useSocialPosts() {
  const context = useContext(SocialPostsContext);

  if (!context) {
    throw new Error("useSocialPosts must be used within a SocialPostsProvider.");
  }

  return context;
}
