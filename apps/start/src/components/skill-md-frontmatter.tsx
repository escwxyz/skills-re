import { m } from "@/paraglide/messages";
import type { SkillFrontmatterData } from "@skills-re/utils";

const getFieldItems = ({
  allowedTools,
  compatibility,
  description,
  license,
  name,
}: SkillFrontmatterData) => [
  { label: m.skill_detail_frontmatter_name(), value: name },
  { label: m.skill_detail_frontmatter_description(), value: description },
  ...(license ? [{ label: m.skill_detail_frontmatter_license(), value: license }] : []),
  ...(compatibility
    ? [{ label: m.skill_detail_frontmatter_compatibility(), value: compatibility }]
    : []),
  ...(allowedTools
    ? [{ label: m.skill_detail_frontmatter_allowed_tools(), value: allowedTools }]
    : []),
];

export const SkillMdFrontmatter = (props: SkillFrontmatterData) => {
  const fields = getFieldItems(props);
  const metadataEntries = props.metadata ? Object.entries(props.metadata) : [];

  return (
    <aside className="hidden self-start font-mono text-[11px] leading-[1.7] text-muted-foreground lg:sticky lg:top-24 lg:block">
      <h6 className="text-muted-foreground mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em]">
        {m.skill_detail_frontmatter()}
      </h6>
      {fields.map((item) => (
        <div key={item.label} className="border-border text-ink-2 border-t py-2">
          <b className="text-ink block font-medium">{item.label}</b>
          {item.value}
        </div>
      ))}
      {metadataEntries.length > 0 && (
        <div className="border-border text-ink-2 border-t py-2">
          <b className="text-ink block font-medium">{m.skill_detail_frontmatter_metadata()}</b>
          {metadataEntries.map(([key, value]) => (
            <div key={key}>
              <span className="text-muted-foreground">{key}:</span> {value}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};
