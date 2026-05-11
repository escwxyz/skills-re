import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { useClaimAuthor } from "@/hooks/use-claim-author";

interface Props {
  slug: string;
}

export const ClaimAuthorButton = ({ slug }: Props) => {
  const { handleClick } = useClaimAuthor({ skillSlug: slug });

  return (
    <Button
      type="button"
      onClick={handleClick}
      className="w-full justify-between"
      variant="default"
    >
      {m.skill_tabs_actions_sign_in_to_claim_as_author()}
    </Button>
  );
};
