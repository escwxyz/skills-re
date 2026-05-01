"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/layouts/dashboard-shell";
import { m } from "@/paraglide/messages";
import { orpc } from "@/lib/orpc";

import { DashboardSkills } from "@/components/dashboard/skills";

import type { CurrentUser, SkillItem } from "./shared";

interface Props {
  currentUser?: CurrentUser | null;
}

export function DashboardSkillsPage({ currentUser }: Props) {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedSkills, setSavedSkills] = useState<SkillItem[]>([]);
  const [savedSkillsError, setSavedSkillsError] = useState<string | null>(null);
  const [isSavedSkillsLoading, setIsSavedSkillsLoading] = useState(true);

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

  useEffect(() => {
    let isActive = true;

    const loadSavedSkills = async () => {
      if (!currentUser) {
        if (isActive) {
          setSavedSkills([]);
          setSavedSkillsError(null);
          setIsSavedSkillsLoading(false);
        }
        return;
      }

      setIsSavedSkillsLoading(true);
      setSavedSkillsError(null);

      try {
        const data = await orpc.skills.listMineSaved({ limit: 100 });

        if (isActive) {
          setSavedSkills(data);
          setSavedSkillsError(null);
        }
      } catch {
        if (isActive) {
          setSavedSkillsError(m.dashboard_skills_failed());
        }
      } finally {
        if (isActive) {
          setIsSavedSkillsLoading(false);
        }
      }
    };

    void loadSavedSkills();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  return (
    <DashboardShell activeRoute="skills" currentUser={currentUser}>
      <DashboardSkills
        currentUser={currentUser}
        isLoading={isLoading}
        savedSkills={savedSkills}
        savedSkillsError={savedSkillsError}
        savedSkillsLoading={isSavedSkillsLoading}
        skills={skills}
        skillsError={skillsError}
      />
    </DashboardShell>
  );
}
