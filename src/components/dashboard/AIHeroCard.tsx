import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, 
  MessageSquare, 
  FileText, 
  Zap,
  ArrowRight,
  Brain,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMCPStore } from '@/stores/mcpStore';

interface AIHeroCardProps {
  userName?: string;
}

export function AIHeroCard({ userName }: AIHeroCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getModelsWithValidKeys, autoMixEnabled } = useMCPStore();
  
  const activeModels = getModelsWithValidKeys();
  const hasAIEnabled = activeModels.length > 0;

  const suggestions = [
    { icon: Lightbulb, label: t('lily.suggestion1'), query: 'Help me plan a new feature' },
    { icon: FileText, label: t('lily.suggestion2'), query: 'Write user stories for authentication' },
    { icon: Brain, label: t('lily.suggestion3'), query: 'Discuss technical architecture' },
    { icon: Zap, label: t('lily.suggestion4'), query: 'Help me debug an issue' },
  ];

  return (
    <Card className="relative overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-background">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <CardContent className="relative p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left side - AI Assistant intro */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  {t('lily.title')}
                  {hasAIEnabled && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                      {activeModels.length} model(s) active
                    </Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('lily.subtitle')}
                </p>
              </div>
            </div>

            <p className="text-muted-foreground">
              {t('lily.welcomeMessage')}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/lily')} className="gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('lily.askLily')}
                <ArrowRight className="h-4 w-4" />
              </Button>
              {!hasAIEnabled && (
                <Button variant="outline" onClick={() => navigate('/settings/llm')} className="gap-2">
                  <Brain className="h-4 w-4" />
                  Setup AI Models
                </Button>
              )}
            </div>
          </div>

          {/* Right side - Quick suggestions */}
          <div className="lg:w-80 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Quick start</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {suggestions.map((suggestion, index) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    key={index}
                    onClick={() => navigate('/lily', { state: { initialQuery: suggestion.query } })}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 border border-border/50 hover:border-violet-500/30 transition-all text-left group"
                  >
                    <Icon className="h-4 w-4 text-violet-500" />
                    <span className="text-sm flex-1">{suggestion.label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Status */}
        {hasAIEnabled && autoMixEnabled && activeModels.length >= 2 && (
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Auto-mix enabled: Using {activeModels.map(m => m.name).join(', ')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
