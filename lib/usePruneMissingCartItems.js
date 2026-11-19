'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { deleteItemFromCart } from '@/lib/features/cart/cartSlice'
import { getCartEntryProductId, getCartEntryQuantity } from '@/lib/freeGiftUtils'

const OBJECT_ID = /^[a-f0-9]{24}$/i

/**
 * Saved cart keys for deleted products still add to the navbar count, while
 * the cart page hides them. Drop those keys once the catalog confirms they
 * are not for sale, so an empty cart shows no badge.
 */
export default function usePruneMissingCartItems() {
  const dispatch = useDispatch()
  const cartItems = useSelector((state) => state.cart.cartItems || {})

  useEffect(() => {
    const entries = Object.entries(cartItems || {})
    if (!entries.length) return undefined

    const staleKeys = []
    const ids = new Set()

    for (const [key, entry] of entries) {
      const qty = getCartEntryQuantity(entry)
      const productId = String(getCartEntryProductId(key, entry) || '').trim()
      if (!(qty > 0) || !OBJECT_ID.test(productId)) {
        staleKeys.push(key)
        continue
      }
      ids.add(productId)
    }

    staleKeys.forEach((productId) => dispatch(deleteItemFromCart({ productId })))
    if (!ids.size) return undefined

    let ignore = false

    ;(async () => {
      try {
        const { data } = await axios.post('/api/products/batch', {
          productIds: [...ids],
        })
        if (ignore || !Array.isArray(data?.products)) return

        const found = new Set(data.products.map((product) => String(product._id)))
        for (const [key, entry] of entries) {
          const productId = String(getCartEntryProductId(key, entry) || '').trim()
          if (!OBJECT_ID.test(productId) || found.has(productId)) continue
          dispatch(deleteItemFromCart({ productId: key }))
        }
      } catch {
        // Leave the saved cart in place if the catalog check fails.
      }
    })()

    return () => {
      ignore = true
    }
  }, [cartItems, dispatch])
}
