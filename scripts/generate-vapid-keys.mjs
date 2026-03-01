#!/usr/bin/env node
// scripts/generate-vapid-keys.mjs
// Генерация VAPID ключей для Web Push уведомлений
// Запуск: node scripts/generate-vapid-keys.mjs

import webpush from 'web-push'

const vapidKeys = webpush.generateVAPIDKeys()

console.log('\n🔑 VAPID Keys Generated!\n')
console.log('Add these to your .env file:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`)
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`)
console.log(`VAPID_SUBJECT="mailto:support@flatro.app"`)
console.log('\n⚠️  NEXT_PUBLIC_VAPID_PUBLIC_KEY is public and safe to expose in the browser.')
console.log('⚠️  VAPID_PRIVATE_KEY is SECRET — never commit it to git!\n')
