import { createFormHook } from "@tanstack/react-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  fieldContext,
  formContext,
} from "@/components/ui/form";

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    Description: FieldDescription,
    Error: FieldError,
    Field,
    Label: FieldLabel,
  },
  fieldContext,
  formComponents: {},
  formContext,
});
