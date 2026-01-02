import { useMemo } from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
  show?: boolean;
}

export function PasswordStrengthIndicator({ password, show = true }: PasswordStrengthIndicatorProps) {
  const checks = useMemo(() => {
    if (!password) return null;

    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    };
  }, [password]);

  if (!show || !password || !checks) return null;

  const passedChecks = Object.values(checks).filter(Boolean).length;
  const allPassed = passedChecks === 4;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1 h-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-200 ${
              i <= passedChecks
                ? allPassed
                  ? "bg-foreground"
                  : "bg-muted-foreground"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="space-y-1">
        {[
          { key: "length", label: "Minst 8 tecken", passed: checks.length },
          { key: "uppercase", label: "En stor bokstav", passed: checks.uppercase },
          { key: "lowercase", label: "En liten bokstav", passed: checks.lowercase },
          { key: "number", label: "En siffra", passed: checks.number },
        ].map((check) => (
          <div key={check.key} className="flex items-center gap-2 text-xs">
            <span
              className={`w-1 h-1 rounded-full transition-colors ${
                check.passed ? "bg-foreground" : "bg-muted"
              }`}
            />
            <span className={check.passed ? "text-foreground" : "text-muted-foreground"}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

