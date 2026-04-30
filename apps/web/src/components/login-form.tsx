"use client";

import { z } from "zod/v4";
import { useAppForm } from "@/hooks/form-hook";
import { m } from "@/paraglide/messages";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Field, FieldError, Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export const LoginForm = () => {
  const schema = z.object({
    email: z.email(m.login_form_invalid_email({})),
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
              <FieldLabel>{m.login_form_email({})}</FieldLabel>
              <Input
                name="email"
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={m.login_form_your_email({})}
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
                <FieldLabel>{m.login_form_password({})}</FieldLabel>
              </div>

              <Input
                id="password"
                name="password"
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={m.login_form_password({})}
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
              {isSubmitting ? m.login_form_signing_in({}) : m.login_form_sign_in({})}
            </Button>
          )}
        </form.Subscribe>
      </Form>
    </form.AppForm>
  );
};
