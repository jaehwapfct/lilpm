import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Zap, 
  GitBranch, 
  BarChart3, 
  Users, 
  Sparkles,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';

export function LandingPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            <span className="text-xl font-semibold">Lil PM</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.features')}
            </a>
            <a href="#ai" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.ai')}
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.pricing')}
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">{t('auth.login')}</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">
                {t('landing.getStartedFree')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-8">
            <Sparkles className="h-4 w-4" />
            <span>{t('landing.aiPowered')}</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            {t('landing.heroTitle1')}
            <br />
            <span className="text-primary">{t('landing.heroTitle2')}</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {t('landing.heroDescription')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-8">
                {t('landing.getStartedFree')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#demo">
              <Button variant="outline" size="lg" className="h-12 px-8">
                {t('landing.watchDemo')}
              </Button>
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{t('landing.freeToStart')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{t('landing.noCardRequired')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{t('landing.proTrial')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
            <div className="aspect-video flex items-center justify-center">
              <div className="text-center p-8">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <p className="text-muted-foreground">{t('landing.appPreview')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.featuresDescription')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Zap className="h-6 w-6" />}
              title={t('landing.feature1Title')}
              description={t('landing.feature1Desc')}
            />
            <FeatureCard 
              icon={<GitBranch className="h-6 w-6" />}
              title={t('landing.feature2Title')}
              description={t('landing.feature2Desc')}
            />
            <FeatureCard 
              icon={<BarChart3 className="h-6 w-6" />}
              title={t('landing.feature3Title')}
              description={t('landing.feature3Desc')}
            />
            <FeatureCard 
              icon={<Users className="h-6 w-6" />}
              title={t('landing.feature4Title')}
              description={t('landing.feature4Desc')}
            />
            <FeatureCard 
              icon={<Sparkles className="h-6 w-6" />}
              title={t('landing.feature5Title')}
              description={t('landing.feature5Desc')}
            />
            <FeatureCard 
              icon={<ArrowUpRight className="h-6 w-6" />}
              title={t('landing.feature6Title')}
              description={t('landing.feature6Desc')}
            />
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
                <Sparkles className="h-4 w-4" />
                <span>Lil PM AI</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {t('landing.aiTitle1')}
                <br />
                <span className="text-primary">{t('landing.aiTitle2')}</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t('landing.aiDescription')}
              </p>
              
              <ul className="space-y-4">
                <AIFeature text={t('landing.aiFeature1')} />
                <AIFeature text={t('landing.aiFeature2')} />
                <AIFeature text={t('landing.aiFeature3')} />
                <AIFeature text={t('landing.aiFeature4')} />
              </ul>
            </div>
            
            <div className="relative">
              <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">Lil PM AI</span>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      {t('landing.chatExample1')}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-primary/10 rounded-lg p-3 text-sm">
                      {t('landing.chatExample2')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            {t('landing.ctaDescription')}
          </p>
          <Link to="/signup">
            <Button size="lg" className="h-12 px-8">
              {t('landing.getStartedFree')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">L</span>
              </div>
              <span className="text-xl font-semibold">Lil PM</span>
            </div>
            
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">{t('landing.terms')}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t('landing.privacy')}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t('landing.contact')}</a>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2025 Lil PM. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function AIFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
      <span>{text}</span>
    </li>
  );
}
