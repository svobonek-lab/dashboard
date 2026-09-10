# DemoFactory - Personalized Construction CRM Demo Generator

DemoFactory is a production-quality internal sales tool designed to instantly generate fully branded, hyper-realistic CRM demos for construction companies.

---

## Features

- **DemoFactory AI Generator**: Input any construction company website URL, and Gemini AI extracts branding colors, services, phone, email, and city.
- **Website Audit Card**: Pre-CRM digital audit showing missing lead forms, slow response workflows, and upgraded system benefits before launching the CRM.
- **Owner & Employee Dashboards**: Executive KPI metrics, sparklines, minimal charts, and a mobile-optimized employee field app with status toggles (Driving, Arrived, Finished).
- **Leads Kanban & Detail View**: 6-stage Kanban pipeline, AI Job Assistant (ChatGPT style summary), checklist, and voice note transcription.
- **Professional PDF Quotes**: Czech standard compliance quotes with pricing tables and signature areas.
- **Auto-Assignment Engine**: Intelligent matching based on specialization, capacity, distance, and priority.

---

## Installation & Setup

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.example` (rename to `.env`):
   ```env
   GEMINI_API_KEY="your_gemini_api_key"
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

---

## Supabase & Database Configuration

DemoFactory integrates with Supabase for persistent data storage across sessions:
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Configure environment credentials in `.env`.
3. Run SQL migration schemas for `leads`, `employees`, and `quotes`.

---

## Vercel Deployment

Deploy instantly to Vercel with zero configuration:
```bash
vercel --prod
```

---

## Branding Workflow

Everything is driven dynamically from `branding/company.json`. You can also dynamically generate or override company branding via the DemoFactory modal.
