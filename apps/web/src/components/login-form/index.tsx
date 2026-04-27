"use client";

import { z } from "zod/v4";
import { getDictionary, useIntlayerContext } from "react-intlayer";
import loginFormContent from "./login-form.content";
import { useAppForm } from "@/hooks/form-hook";

import { Button } from "../ui/button";
import { FieldLabel } from "../ui/field";
import { Field, FieldError, Form } from "../ui/form";
import { Input } from "../ui/input";

export const LoginForm = () => {
  const { locale } = useIntlayerContext() ?? {};
  const content = getDictionary(loginFormContent, locale);

  const schema = z.object({
    email: z.email(String(content.invalidEmail)),
    password: z.string().min(1),
  });

  type FormSchema = z.infer<typeof schema>;

  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    } as FormSchema,
    validators: {
      onSubmit: schema,
    },
  });

  return (
    <form.AppForm>
      <Form className="space-y-5">
        <form.AppField name="email">
          {(field) => (
            <Field className="space-y-3">
              <FieldLabel>{content.email}</FieldLabel>
              <Input
                name="email"
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={String(content.yourEmail)}
                required
                type="email"
                value={field.state.value}
              />
              <FieldError />
            </Field>
          )}
        </form.AppField>

        <form.AppField name="password">
          {(field) => (
            <Field className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{content.password}</FieldLabel>
              </div>

              <Input
                id="password"
                name="password"
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={String(content.password)}
                required
                type="password"
                value={field.state.value}
              />
              <FieldError />
            </Field>
          )}
        </form.AppField>

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button className="w-full" disabled={!canSubmit || isSubmitting} type="submit">
              {isSubmitting ? content.signingIn : content.signIn}
            </Button>
          )}
        </form.Subscribe>
      </Form>
    </form.AppForm>
  );
};
