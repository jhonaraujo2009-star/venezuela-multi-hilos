/**
 * FIRESTORE SCHEMA - E-Commerce App
 * ==================================
 *
 * /config/settings  (document)
 *   - exchangeRate: number
 *   - whatsappNumber: string
 *   - freeShippingGoal: number
 *   - primaryColor: string (hex)
 *   - announcementText: string
 *   - profileImage: string (Storage URL)
 *   - heroTitle: string
 *   - heroDescription: string
 *   - socialLinks: { instagram, tiktok, facebook, twitter }
 *   - quickButtons: [{ id, label, icon, filter }]
 *   - legalText: string
 *   - happyCustomerImages: [string] (Storage URLs)
 *
 * /sessions  (collection)
 *   - id: auto
 *   - name: string
 *   - slug: string
 *   - hidden: boolean
 *   - order: number
 *   - createdAt: timestamp
 *
 * /products  (collection)
 *   - id: auto
 *   - name: string
 *   - description: string (rich text HTML)
 *   - price: number (USD)
 *   - sessionId: string (ref to sessions)
 *   - images: [string] (Storage URLs)
 *   - variants: [{ id, label, stock }]
 *     - if no variants: stock stored directly as totalStock
 *   - totalStock: number (computed or direct)
 *   - featured: boolean
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 *
 * /products/{productId}/comments  (subcollection)
 *   - id: auto
 *   - text: string
 *   - authorName: string
 *   - createdAt: timestamp
 *   - adminReply: string | null
 *   - adminRepliedAt: timestamp | null
 *
 * /questions  (collection)
 *   - id: auto
 *   - phone: string
 *   - text: string
 *   - createdAt: timestamp
 *   - adminReply: string | null
 *   - adminRepliedAt: timestamp | null
 *   - isPublic: boolean
 *
 * /payments  (collection)
 *   - id: auto
 *   - bankName: string
 *   - holderName: string
 *   - idNumber: string
 *   - phone: string
 *   - accountNumber: string
 *   - logo: string (Storage URL)
 *   - type: "bank" | "mobile_payment" | "other"
 *   - order: number
 *
 * /coupons  (collection)
 *   - id: auto
 *   - code: string (unique, uppercase)
 *   - type: "percent" | "fixed"
 *   - value: number
 *   - active: boolean
 *   - usageLimit: number | null
 *   - usageCount: number
 *
 * /logistics  (collection)
 *   - id: "mrw" | "zoom" | "tealca"
 *   - name: string
 *   - logo: string (Storage URL)
 *   - url: string
 *
 * SEED DATA (inject on first run):
 * ---------------------------------
 * /payments: {
 *   bankName: "Banco de Venezuela",
 *   holderName: "Jhon Araujo",
 *   idNumber: "V-23493744",
 *   phone: "04120496690",
 *   accountNumber: "",
 *   type: "mobile_payment",
 *   order: 1
 * }
 */

export const FIRESTORE_SCHEMA = "see comments above";
