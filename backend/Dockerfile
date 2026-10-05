# استخدام نسخة خفيفة ومستقرة من Node.js
FROM node:18-alpine

# تحديد مجلد العمل داخل الحاوية
WORKDIR /usr/src/app

# نسخ ملفات الحزم وتثبيت المكتبات
COPY package*.json ./
RUN npm install --production

# نسخ باقي ملفات السيرفر
COPY . .

# تحديد المنفذ الافتراضي
ENV PORT=8080
EXPOSE 8080

# أمر تشغيل السيرفر
CMD [ "npm", "start" ]