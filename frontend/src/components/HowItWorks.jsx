import { useTranslation } from 'react-i18next';
import { Target, Lightbulb, Wand2, Download, ArrowRight } from 'lucide-react';
import './HowItWorks.css';

const STEP_ICONS = [
  <Lightbulb key="1" size={32} strokeWidth={2.2} color="#f2c84b" />,
  <Wand2 key="2" size={32} strokeWidth={2.2} color="#f2c84b" />,
  <Download key="3" size={32} strokeWidth={2.2} color="#f2c84b" />,
];

export default function HowItWorks() {
  const { t } = useTranslation();
  const steps = t('howItWorks.steps', { returnObjects: true });

  return (
    <section className="how-section section" id="how-it-works">
      <div className="container">
        <div className="how-header">
          <div className="badge" style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Target size={14} strokeWidth={2.4} color="#f2c84b" />
            <span>{t('howItWorks.title')}</span>
          </div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '12px' }}>
            {t('howItWorks.title')}
          </h2>
          <p style={{ maxWidth: '500px', margin: '0 auto' }}>
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="how-grid">
          {steps.map((step, index) => (
            <div key={index} className="how-card card">
              <div className="how-step-num">{String(index + 1).padStart(2, '0')}</div>
              <div className="how-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {STEP_ICONS[index]}
              </div>
              <h3 className="how-card-title">{step.title}</h3>
              <p className="how-card-desc">{step.desc}</p>
              {index < steps.length - 1 && (
                <div className="how-arrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRight size={20} strokeWidth={2.5} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
