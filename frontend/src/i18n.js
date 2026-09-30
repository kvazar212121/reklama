import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  uz: {
    translation: {
      nav: {
        home: "Bosh sahifa",
        howItWorks: "Qanday ishlaydi",
        pricing: "Narxlar",
        login: "Kirish",
        googleLogin: "Google orqali kirish",
        logout: "Chiqish",
      },
      hero: {
        badge: "AI bilan ishlangan",
        title: "Reklama videoni",
        titleHighlight: "soniyalarda yarating",
        subtitle: "G'oyangizni va rasmingizni yuboring — biz sizga professional reklama videoni avtomatik tayyorlab beramiz.",
        cta: "Bepul boshlash",
        ctaSecondary: "Qanday ishlashini ko'rish",
      },
      upload: {
        title: "Video yaratish",
        subtitle: "Quyidagi ma'lumotlarni kiriting va bir necha daqiqa ichida tayyor videongizni oling",
        step1: "1. Reklama g'oyangizni kiriting",
        textPlaceholder: "Masalan: Yangi smartfonim bor, u 5000 mAh batareya va 200MP kamera bilan jihozlangan...",
        step2: "2. Rasm yoki logo yuklang",
        imageUpload: "Rasm yuklash uchun bosing yoki torting",
        imageFormat: "PNG, JPG, WEBP — max 10MB",
        step3: "3. Musiqa kayfiyatini tanlang",
        moods: {
          energetic: "Energetik",
          calm: "Tinch & Professional",
          happy: "Quvnoq & Ijobiy",
          cinematic: "Kinematografik",
          corporate: "Korporativ",
        },
        step4: "4. Video uzunligi",
        durations: {
          s30: "30 soniya",
          s60: "60 soniya",
        },
        submit: "Video yaratish",
        submitting: "Yaratilmoqda...",
        required: "Bu maydon to'ldirilishi shart",
      },
      progress: {
        title: "Videongiz tayyorlanmoqda...",
        subtitle: "Bu bir necha daqiqa vaqt olishi mumkin",
        steps: {
          analyzing: "G'oya tahlil qilinmoqda",
          designing: "Vizual dizayn yaratilmoqda",
          animating: "Animatsiya qo'shilmoqda",
          music: "Musiqa mos keltirilmoqda",
          rendering: "Video render qilinmoqda",
          done: "Tayyor!",
        },
      },
      result: {
        title: "Videongiz tayyor! 🎉",
        subtitle: "Professional reklama videongiz muvaffaqiyatli yaratildi",
        download: "Yuklab olish",
        createNew: "Yangi video yaratish",
        share: "Ulashish",
      },
      howItWorks: {
        title: "Qanday ishlaydi?",
        subtitle: "3 oddiy qadamda professional reklama videongizni oling",
        steps: [
          { title: "G'oyani kiriting", desc: "Mahsulot yoki xizmat haqida qisqacha yozing va rasm yuklang" },
          { title: "AI ishlaydi", desc: "Bizning AI tizim avtomatik ravishda professional video tayyorlaydi" },
          { title: "Yuklab oling", desc: "Tayyor MP4 videoni yuklab oling va istalgan joyda ishlating" },
        ],
      },
      footer: {
        rights: "Barcha huquqlar himoyalangan",
        tagline: "O'zbekistonning #1 AI Reklama Video Platformasi",
      },
    },
  },
  en: {
    translation: {
      nav: {
        home: "Home",
        howItWorks: "How It Works",
        pricing: "Pricing",
        login: "Login",
        googleLogin: "Sign in with Google",
        logout: "Log out",
      },
      hero: {
        badge: "Powered by AI",
        title: "Create Ad Videos",
        titleHighlight: "in seconds",
        subtitle: "Submit your idea and image — we'll automatically create a professional ad video for you.",
        cta: "Start for Free",
        ctaSecondary: "See How It Works",
      },
      upload: {
        title: "Create Video",
        subtitle: "Enter the details below and get your ready video in minutes",
        step1: "1. Enter your ad idea",
        textPlaceholder: "E.g.: I have a new smartphone with 5000 mAh battery and 200MP camera...",
        step2: "2. Upload image or logo",
        imageUpload: "Click or drag to upload image",
        imageFormat: "PNG, JPG, WEBP — max 10MB",
        step3: "3. Choose music mood",
        moods: {
          energetic: "Energetic",
          calm: "Calm & Professional",
          happy: "Happy & Positive",
          cinematic: "Cinematic",
          corporate: "Corporate",
        },
        step4: "4. Video duration",
        durations: {
          s30: "30 seconds",
          s60: "60 seconds",
        },
        submit: "Create Video",
        submitting: "Creating...",
        required: "This field is required",
      },
      progress: {
        title: "Your video is being prepared...",
        subtitle: "This may take a few minutes",
        steps: {
          analyzing: "Analyzing your idea",
          designing: "Creating visual design",
          animating: "Adding animations",
          music: "Matching music",
          rendering: "Rendering video",
          done: "Done!",
        },
      },
      result: {
        title: "Your Video is Ready! 🎉",
        subtitle: "Your professional ad video was created successfully",
        download: "Download",
        createNew: "Create New Video",
        share: "Share",
      },
      howItWorks: {
        title: "How Does It Work?",
        subtitle: "Get your professional ad video in 3 simple steps",
        steps: [
          { title: "Enter Your Idea", desc: "Write briefly about your product or service and upload an image" },
          { title: "AI Works", desc: "Our AI system automatically prepares a professional video" },
          { title: "Download", desc: "Download the ready MP4 video and use it anywhere" },
        ],
      },
      footer: {
        rights: "All rights reserved",
        tagline: "Uzbekistan's #1 AI Ad Video Platform",
      },
    },
  },
  ru: {
    translation: {
      nav: {
        home: "Главная",
        howItWorks: "Как это работает",
        pricing: "Цены",
        login: "Войти",
        googleLogin: "Войти через Google",
        logout: "Выйти",
      },
      hero: {
        badge: "На базе ИИ",
        title: "Создавайте рекламные видео",
        titleHighlight: "за секунды",
        subtitle: "Отправьте вашу идею и изображение — мы автоматически создадим профессиональное рекламное видео.",
        cta: "Начать бесплатно",
        ctaSecondary: "Смотреть как это работает",
      },
      upload: {
        title: "Создать видео",
        subtitle: "Введите данные ниже и получите готовое видео за несколько минут",
        step1: "1. Введите идею рекламы",
        textPlaceholder: "Например: У меня есть новый смартфон с батареей 5000 мАч и камерой 200МП...",
        step2: "2. Загрузите изображение или логотип",
        imageUpload: "Нажмите или перетащите для загрузки",
        imageFormat: "PNG, JPG, WEBP — макс 10МБ",
        step3: "3. Выберите настроение музыки",
        moods: {
          energetic: "Энергичный",
          calm: "Спокойный & Профессиональный",
          happy: "Весёлый & Позитивный",
          cinematic: "Кинематографичный",
          corporate: "Корпоративный",
        },
        step4: "4. Длительность видео",
        durations: {
          s30: "30 секунд",
          s60: "60 секунд",
        },
        submit: "Создать видео",
        submitting: "Создаётся...",
        required: "Это поле обязательно для заполнения",
      },
      progress: {
        title: "Ваше видео готовится...",
        subtitle: "Это может занять несколько минут",
        steps: {
          analyzing: "Анализируем вашу идею",
          designing: "Создаём визуальный дизайн",
          animating: "Добавляем анимацию",
          music: "Подбираем музыку",
          rendering: "Рендеринг видео",
          done: "Готово!",
        },
      },
      result: {
        title: "Ваше видео готово! 🎉",
        subtitle: "Ваше профессиональное рекламное видео успешно создано",
        download: "Скачать",
        createNew: "Создать новое видео",
        share: "Поделиться",
      },
      howItWorks: {
        title: "Как это работает?",
        subtitle: "Получите профессиональное рекламное видео в 3 простых шага",
        steps: [
          { title: "Введите идею", desc: "Кратко напишите о вашем продукте или услуге и загрузите изображение" },
          { title: "ИИ работает", desc: "Наша система ИИ автоматически подготовит профессиональное видео" },
          { title: "Скачайте", desc: "Скачайте готовое MP4 видео и используйте где угодно" },
        ],
      },
      footer: {
        rights: "Все права защищены",
        tagline: "Платформа №1 для рекламных видео с ИИ в Узбекистане",
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'uz',
    fallbackLng: 'uz',
    interpolation: { escapeValue: false },
  });

export default i18n;
