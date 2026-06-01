import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { useClaimAuthor } from "@/hooks/use-claim-author";
import { UserPlusIcon } from "@phosphor-icons/react";

interface Props {
  slug: string;
}

export const ClaimAuthorButton = ({ slug }: Props) => {
  const { handleClick } = useClaimAuthor({ skillSlug: slug });

  return (
    <Button type="button" onClick={handleClick} className="w-full max-w-md" variant="outline">
      <UserPlusIcon aria-hidden className="size-4" />{" "}
      {m.skill_tabs_actions_sign_in_to_claim_as_author()}
    </Button>
  );
};
