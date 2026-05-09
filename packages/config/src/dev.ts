export const resolveDevTestUserEnabled = ({
  configuredValue,
  isProduction,
}: {
  configuredValue?: string | null;
  isProduction: boolean;
}) => !isProduction && configuredValue !== "false";
