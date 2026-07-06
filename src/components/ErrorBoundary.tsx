import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in boundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6" dir="rtl">
          <div className="max-w-md w-full text-center space-y-6 bg-card border border-border rounded-xl p-8 shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              حدث خطأ غير متوقع في النظام!
            </h1>
            
            <p className="text-muted-foreground text-sm leading-relaxed">
              نأسف لذلك، واجه التطبيق خطأً غير متوقع ومنع الواجهة من الاستمرار. يمكنك محاولة تحديث الصفحة أو إخبار الدعم التقني إذا استمرت المشكلة.
            </p>

            {this.state.error && (
              <div className="p-3 bg-muted/50 rounded-lg text-right font-mono text-xs overflow-x-auto text-destructive border border-border/40">
                <strong>الرسالة التقنية:</strong> {this.state.error.message}
              </div>
            )}

            <div className="pt-4">
              <Button onClick={this.handleReload} className="w-full flex items-center justify-center gap-2">
                <RotateCcw className="h-4 w-4" />
                <span>تحديث الصفحة</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
