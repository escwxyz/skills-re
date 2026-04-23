// oxlint-disable no-nested-ternary
/** biome-ignore-all lint/style/noNestedTernary: <ignore> */
"use client";

import { useEffect, useState } from "react";
import { z } from "zod/v4";

import { useAppForm } from "@/hooks/form-hook";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const formSchema = z.object({
  email: z.email(m.ui_please_enter_a_valid_email()),
  otp: z.string(),
});

type FormSchema = z.infer<typeof formSchema>;

const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
};

export const EmailOtpForm = ({ onBack }: { onBack: () => void; callbackUrl?: string }) => {
  const [didSend, setDidSend] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const form = useAppForm({
    defaultValues: {
      email: "",
      otp: "",
    } as FormSchema,
    onSubmit: async ({ value }) => {
      if (!didSend) {
        setErrorMessage(m.ui_send_a_verification_code_first());
        return;
      }

      if (!value.otp || value.otp.length < 6) {
        setErrorMessage(m.ui_enter_the_6_digit_verification_code());
        return;
      }

      setIsVerifying(true);
      setErrorMessage(null);
      setStatusMessage(null);

      try {
        await authClient.signIn.emailOtp({
          email: value.email,
          fetchOptions: {
            onSuccess: () => {
              window.location.href = "/dashboard";
            },
          },
          otp: value.otp,
        });
      } catch {
        setErrorMessage(m.ui_invalid_or_expired_code_please_try_again());
      } finally {
        setIsVerifying(false);
      }
    },
    validators: {
      onSubmit: formSchema,
    },
  });

  const resetForm = () => {
    setDidSend(false);
    setIsSending(false);
    setIsVerifying(false);
    setStatusMessage(null);
    setErrorMessage(null);
    setSecondsLeft(null);
    form.reset({
      email: "",
      otp: "",
    } as FormSchema);
  };

  const handleSendOtp = async () => {
    const emailValue = form.state.values.email?.trim();
    if (!(emailValue && z.email().safeParse(emailValue).success)) {
      setErrorMessage(m.ui_please_enter_a_valid_email());
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email: emailValue,
        type: "sign-in",
      });
      setDidSend(true);
      setSecondsLeft(300);
      setStatusMessage(m.ui_verification_code_sent_check_your_inbox());
    } catch {
      setErrorMessage(m.ui_could_not_send_code_please_try_again());
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!secondsLeft || secondsLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleBack = () => {
    resetForm();
    onBack();
  };

  return (
    <form.AppForm>
      <Form autoComplete="on" className="space-y-5">
        <form.AppField name="email">
          {(field) => (
            <Field className="space-y-2">
              <FieldLabel>{m.ui_email_address()}</FieldLabel>
              <Input
                autoComplete="email"
                className="h-10 text-sm"
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder={m.ui_you_company_com()}
                type="email"
                value={field.state.value}
              />
              <FieldError />
            </Field>
          )}
        </form.AppField>

        {didSend && (
          <form.AppField name="otp">
            {(field) => (
              <Field className="space-y-2">
                <div className="flex items-center justify-between">
                  <FieldLabel>{m.ui_verification_code()}</FieldLabel>
                  {secondsLeft !== null && secondsLeft > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {formatCountdown(secondsLeft)}
                    </span>
                  )}
                </div>
                <InputOTP
                  autoComplete="one-time-code"
                  maxLength={6}
                  onChange={(value) => field.handleChange(value.replaceAll(/\s+/g, ""))}
                  onComplete={(value) => {
                    field.handleChange(value.replaceAll(/\s+/g, ""));
                    if (didSend && !isVerifying) {
                      form.handleSubmit();
                    }
                  }}
                  value={field.state.value ?? ""}
                >
                  <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <FieldError />
              </Field>
            )}
          </form.AppField>
        )}

        {statusMessage && <p className="text-muted-foreground text-xs">{statusMessage}</p>}
        {errorMessage && <p className="text-destructive text-xs">{errorMessage}</p>}

        <div className="space-y-3">
          <form.Subscribe selector={(state) => state.values.email}>
            {(emailValue) => (
              <Button
                className="h-10 w-full cursor-pointer text-sm"
                disabled={isSending || !emailValue}
                onClick={handleSendOtp}
                type="button"
                variant="secondary"
              >
                {isSending
                  ? m.ui_sending()
                  : didSend
                    ? m.ui_resend_verification_code()
                    : m.ui_send_verification_code()}
              </Button>
            )}
          </form.Subscribe>

          <form.Subscribe
            selector={(state) => [state.values.otp, state.canSubmit, state.isSubmitting]}
          >
            {([otpValue, canSubmit, isSubmitting]) => (
              <Button
                className="h-10 w-full text-sm"
                disabled={
                  !didSend || isVerifying || Boolean(isSubmitting) || !canSubmit || !otpValue
                }
                type="submit"
              >
                {isVerifying || isSubmitting ? m.ui_verifying() : m.ui_verify_and_continue()}
              </Button>
            )}
          </form.Subscribe>

          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <button
              className="hover:text-foreground underline underline-offset-4"
              onClick={handleBack}
              type="button"
            >
              {m.ui_back_to_sign_in_options()}
            </button>
            {didSend && (
              <button
                className="hover:text-foreground underline underline-offset-4"
                onClick={handleSendOtp}
                type="button"
              >
                {m.ui_resend_code()}
              </button>
            )}
          </div>
        </div>
      </Form>
    </form.AppForm>
  );
};
