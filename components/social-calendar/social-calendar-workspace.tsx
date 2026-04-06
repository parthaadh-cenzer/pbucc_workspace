"use client";

import { useState } from "react";
import { useCampaigns } from "@/components/campaigns/campaigns-provider";
import { SocialCalendarSection } from "@/components/social-review/social-calendar-section";
import { useSocialPosts } from "@/components/social-review/social-posts-provider";
import { UploadSocialPostModal } from "@/components/social-review/upload-social-post-modal";
import type { NewSocialPostInput } from "@/lib/mock-social-review";

export function SocialCalendarWorkspace() {
  const { campaigns } = useCampaigns();
  const { posts, addPost } = useSocialPosts();
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleUpload = (input: NewSocialPostInput) => {
    addPost(input);
  };

  return (
    <div className="space-y-5">
      <SocialCalendarSection
        posts={posts}
        campaigns={campaigns}
        onCreatePost={() => setUploadOpen(true)}
        onUploadForReview={() => setUploadOpen(true)}
      />

      <UploadSocialPostModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        campaigns={campaigns}
        onUpload={handleUpload}
      />
    </div>
  );
}
