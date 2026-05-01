"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/layouts/dashboard-shell";
import { m } from "@/paraglide/messages";
import { orpc } from "@/lib/orpc";

import { DashboardSkills } from "@/components/dashboard/skills";

import type { CurrentUser } from "./shared";

interface SkillItem {
  authorHandle?: string;
  createdAt?: number;
  description: string;
  id: string;
  latestVersion?: string;
  repoName?: string;
  slug: string;
  tags?: string[];
  title: string;
  updatedAt?: number;
}

interface Props {
  currentUser?: CurrentUser | null;
}

export function DashboardSkillsPage({ currentUser }: Props) {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadSkills = async () => {
      if (!currentUser) {
        if (isActive) {
          setSkills([]);
          setSkillsError(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setSkillsError(null);

      try {
        const data = await orpc.skills.listMine({ limit: 100 });

        if (isActive) {
          setSkills(data);
          setSkillsError(null);
        }
      } catch {
        if (isActive) {
          setSkillsError(m.dashboard_skills_failed());
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadSkills();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  return (
    <DashboardShell activeRoute="skills" currentUser={currentUser}>
      <DashboardSkills
        currentUser={currentUser}
        isLoading={isLoading}
        skills={skills}
        skillsError={skillsError}
      />
    </DashboardShell>
  );
}
