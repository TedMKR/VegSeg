# 🌱 VegSeg - Платформа для сегментации растительности

**Быстрая, современная и масштабируемая платформа для сегментации растительности на аэрофотоснимках и спутниковых
изображениях**

![Python](https://img.shields.io/badge/python-v3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)
![React](https://img.shields.io/badge/react-v18.2+-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-v4.9+-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![TensorFlow](https://img.shields.io/badge/tensorflow-2.16-orange.svg)
![Keras](https://img.shields.io/badge/keras-3.0-red.svg)

<a href="https://colab.research.google.com/drive/1U9XDvxDazY-RbyZqpYReMHzc4Ihx0hAA#scrollTo=HNboFma3atHg" target="_blank">
  <button style="background-color:#F9AB00; color:white; padding:12px 24px; border:none; border-radius:6px; font-size:16px; cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:10px;">
    <img src="https://colab.research.google.com/img/colab_favicon_256px.png" alt="Colab" style="width:20px; height:20px;">
    Открыть Colab
  </button>
</a>

## ✨ Возможности

- **🚀 Быстрая обработка**: Ускоренный вывод с использованием глубокого обучения на GPU
- **📁 Множество форматов**: Поддержка JPEG, PNG, TIFF и GeoTIFF
- **🎯 Высокая точность**: Продвинутая модель U-Net для точного обнаружения растительности
- **🧠 AI-модель**: 7-классовая сегментация
- **🔌 REST API**: Полноценный API для бесшовной интеграции
- **📚 Автодокументация**: Встроенная документация API
- **🐳 Готов к Docker**: Запуск одной командой
- **🎨 Современный UI**: Лаконичный интерфейс на React

## 🚀 Быстрый старт

- Сборка: ```docker compose up --build```
- Доступ:  http://localhost:3000 (dev server)

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      Клиент (Браузер)                        │
│                    http://localhost:3000                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (React + TypeScript)               │
│                         Nginx:80                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  HomePage   │  │ ResultsView  │  │ ApiDocsPage  │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (FastAPI + TensorFlow)                  │
│                   http://localhost:8000                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FastAPI Application (main.py)                       │   │
│  │  - /segment/upload  - /segment/url                   │   │
│  │  - /tasks/{id}      - /health                        │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │  AI Model (model7.keras - 280 MB)                    │   │
│  │  - Architecture: U-Net + ResNet34                    │   │
│  │  - Input: 512x512x3 patches                          │   │
│  │  - Output: 512x512x7 classes                         │   │
│  │  - Classes: 7 (vegetation types + background)        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Redis (Task Queue)                        │
│                         Port 6379                            │
└─────────────────────────────────────────────────────────────┘
```


## 📊 Технические детали

### Модель AI

- **Архитектура**: U-Net с ResNet34 backbone
- **Фреймворк**: TensorFlow 2.16 + Keras 3.0
- **Входные данные**: Патчи 512x512x3 (RGB)
- **Выходные данные**: Патчи 512x512x7 (7 классов)
- **Размер модели**: ~280 MB
- **Обучение**: Segmentation Models library
- **Препроцессинг**: ResNet34-specific preprocessing

### Классы сегментации

```python
# Модель выводит 7 классов:
# 0 - Фон (не растительность)
# 1-6 - Различные типы растительности
```

### Обработка изображений

1. **Загрузка**: Поддержка TIFF, GeoTIFF, JPEG, PNG
2. **Разделение на патчи**: Изображение делится на патчи 512x512
3. **Препроцессинг**: Нормализация для ResNet34
4. **Инференс**: Модель обрабатывает каждый патч
5. **Реконструкция**: Патчи собираются обратно
6. **Постпроцессинг**: Создание бинарной маски растительности

### Стек технологий

**Backend:**

- FastAPI 0.104
- TensorFlow 2.16.1
- Keras 3.0.5
- Segmentation Models 1.0.1
- OpenCV 4.8
- Rasterio 1.3 (для GeoTIFF)
- Redis (очередь задач)

**Frontend:**

- React 18.2
- TypeScript 4.9
- Chakra UI 2.8
- Axios (HTTP клиент)
- React Query (управление состоянием)

**DevOps:**

- Docker & Docker Compose
- Nginx (reverse proxy для frontend)

## 📄 Лицензия

MIT License - свободно используйте в ваших проектах

---

**Разработано совместно с [Gubare](https://github.com/Gubare)**