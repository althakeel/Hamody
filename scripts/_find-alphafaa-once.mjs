import fs from 'fs'
import mongoose from 'mongoose'

const env = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
const uri = env.split('\n').map((line) => line.trim()).find((line) => line.startsWith('MONGODB_URI='))?.slice('MONGODB_URI='.length).replace(/^["']|["']$/g, '')
if (!uri) {
  console.error('MONGODB_URI missing')
  process.exit(1)
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 })
const db = mongoose.connection.db
const cols = (await db.listCollections().toArray()).map((col) => col.name)
const needle = /alphafaa/i

const small = new Set(['categories', 'storepreferences', 'categorysliders', 'brandpages', 'homesections', 'sections', 'section4'])
for (const name of cols) {
  const col = db.collection(name)
  if (small.has(name.toLowerCase()) || name.toLowerCase().includes('categor') || name.toLowerCase().includes('preference') || name.toLowerCase().includes('slider') || name.toLowerCase().includes('banner')) {
    const cursor = col.find({}, { limit: 200 })
    for await (const doc of cursor) {
      const flat = JSON.stringify(doc)
      const idx = flat.toLowerCase().indexOf('alphafaa')
      if (idx >= 0) console.log(name, flat.slice(Math.max(0, idx - 40), idx + 160))
    }
    continue
  }
  const doc = await col.findOne({
    $or: [
      { image: needle },
      { images: needle },
      { imageAr: needle },
      { externalImages: needle },
      { description: needle },
      { descriptionAr: needle },
      { bannerImage: needle },
      { sideImage: needle },
    ],
  })
  if (!doc) continue
  const flat = JSON.stringify(doc)
  const idx = flat.toLowerCase().indexOf('alphafaa')
  console.log(name, flat.slice(Math.max(0, idx - 40), idx + 160))
}

await mongoose.disconnect()
