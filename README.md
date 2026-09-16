# Sathish M portfolio

React + Vite frontend with a small, dependency-free Python API for approved student reviews. It is built from the supplied résumé.

## Run locally

```bash
npm install
python3 api/server.py
```

In a second terminal:

```bash
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The React frontend reads approved reviews from the Python API at `http://localhost:8001/api/testimonials`.

Build a production frontend with `npm run build`.

## Add student reviews

Edit `testimonials.json`. Only entries with `"approved": true` render. Obtain explicit consent before publishing a name, quotation, or image.

## Add workshop photos

Place consented images in `public/images/students/` and replace the visual placeholder in `index.html` with an image element that includes meaningful alt text.

## Resume

The downloadable source is `public/resume.pdf`.
# sathish
