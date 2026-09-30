import { useTranslation } from 'react-i18next';
import './HowItWorks.css';

const ICONS = ['💡', '🤖', '⬇'];

export default function HowItWorks() {
  const { t } = useTranslation();
  const steps = t('howItWorks.steps', { returnObjects: true });

  return (
    <section className="how-section section" id="how-it-works">
      <div className="container">
        <div className="how-header">
          <div className="badge" style={{ marginBottom: '16px' }}>
            <span>🎯</span> {t('howItWorks.title')}
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
              <div className="how-icon">{ICONS[index]}</div>
              <h3 className="how-card-title">{step.title}</h3>
              <p className="how-card-desc">{step.desc}</p>
              {index < steps.length - 1 && (
                <div className="how-arrow">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
