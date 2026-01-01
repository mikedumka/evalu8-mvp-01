import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  roles: z.array(z.string()).min(1, "Select at least one role"),
});

interface InviteAssociationUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AVAILABLE_ROLES = [
  { id: "Administrator", label: "Association Administrator" },
  { id: "Evaluator", label: "Evaluator" },
  { id: "Intake Personnel", label: "Intake Personnel" },
];

export function InviteAssociationUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteAssociationUserDialogProps) {
  const { currentAssociation } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      roles: ["Evaluator"],
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentAssociation) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "invite-association-user",
        {
          body: {
            email: values.email,
            fullName: `${values.firstName} ${values.lastName}`.trim(),
            roles: values.roles,
            associationId: currentAssociation.association_id,
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to invite user:", err);

      let errorMessage = (err as Error).message;

      // Try to extract JSON error from response if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any)?.context?.json) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const body = await (err as any).context.json();
          if (body?.error) {
            errorMessage = body.error;
          }
        } catch {
          // Ignore JSON parse errors
        }
      }

      setError(errorMessage || "An unknown error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite a new member to {currentAssociation?.association.name}. They
            will receive an email invitation.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="roles"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Roles</FormLabel>
                  </div>
                  <div className="space-y-2">
                    {AVAILABLE_ROLES.map((role) => (
                      <FormField
                        key={role.id}
                        control={form.control}
                        name="roles"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={role.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(role.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([
                                          ...field.value,
                                          role.id,
                                        ])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== role.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {role.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
