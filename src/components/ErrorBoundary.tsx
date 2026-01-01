import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isEnvError = this.state.error?.message?.includes("Supabase environment variables");

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Något gick fel</h1>

              {isEnvError ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Supabase-konfigurationen saknas. Kontrollera att följande miljövariabler är korrekt konfigurerade:
                  </p>
                  <div className="bg-muted p-4 rounded-lg text-left text-sm">
                    <code className="block">VITE_SUPABASE_URL</code>
                    <code className="block">VITE_SUPABASE_ANON_KEY</code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se <code>.env.example</code> för mer information.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Ett oväntat fel inträffade. Försök ladda om sidan.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Button onClick={this.handleReload} className="w-full">
                Ladda om sidan
              </Button>

              {!isEnvError && this.state.error && (
                <details className="text-left mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Teknisk information
                  </summary>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
