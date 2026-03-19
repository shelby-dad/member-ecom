import { describe, expect, it } from 'vitest'
import { listAdminOrders } from '~/server/services/order-list/admin-orders'
import { listMemberOrders } from '~/server/services/order-list/member-orders'

function createOrdersQuery(result: any, capture: { eq: Array<[string, any]> }) {
  return {
    select() { return this },
    eq(field: string, value: any) { capture.eq.push([field, value]); return this },
    gte() { return this },
    lte() { return this },
    is() { return this },
    order() { return this },
    range() { return Promise.resolve(result) },
  }
}

describe('order list services', () => {
  it('member list uses DB pagination when search is empty', async () => {
    const capture = { eq: [] as Array<[string, any]> }
    const ordersQuery = createOrdersQuery({
      data: [{ id: 'o1', order_number: 'ORD-AAAA1111', total: 1000, status: 'pending' }],
      error: null,
      count: 1,
    }, capture)
    const supabase = {
      from(table: string) {
        if (table === 'orders')
          return ordersQuery
        throw new Error(`Unexpected table: ${table}`)
      },
    } as any

    const res = await listMemberOrders(supabase, {
      userId: 'u1',
      q: '',
      status: '',
      fromIso: null,
      toIso: null,
      page: 1,
      perPage: 25,
      sortBy: 'created_at',
      sortOrder: 'desc',
    })

    expect(res.total).toBe(1)
    expect(res.items).toHaveLength(1)
    expect(capture.eq).toContainEqual(['user_id', 'u1'])
  })

  it('member list exact order search normalizes to uppercase', async () => {
    const capture = { eq: [] as Array<[string, any]> }
    const ordersQuery = createOrdersQuery({
      data: [{ id: 'o2', order_number: 'ORD-ABCD1234' }],
      error: null,
      count: 1,
    }, capture)
    const supabase = {
      from(table: string) {
        if (table === 'orders')
          return ordersQuery
        throw new Error(`Unexpected table: ${table}`)
      },
    } as any

    await listMemberOrders(supabase, {
      userId: 'u1',
      q: 'ord-abcd1234',
      status: '',
      fromIso: null,
      toIso: null,
      page: 1,
      perPage: 25,
      sortBy: 'created_at',
      sortOrder: 'desc',
    })

    expect(capture.eq).toContainEqual(['order_number', 'ORD-ABCD1234'])
  })

  it('admin list exact order search returns member fields', async () => {
    const orderCapture = { eq: [] as Array<[string, any]> }
    const ordersQuery = createOrdersQuery({
      data: [{
        id: 'o3',
        order_number: 'ORD-ZZZZ9999',
        user_id: 'u3',
        status: 'pending',
        total: 2000,
      }],
      error: null,
      count: 1,
    }, orderCapture)

    const profilesQuery = {
      select() { return this },
      in() {
        return Promise.resolve({
          data: [{ id: 'u3', email: 'u3@test.com', full_name: 'User Three' }],
          error: null,
        })
      },
    }

    const supabase = {
      from(table: string) {
        if (table === 'orders')
          return ordersQuery
        if (table === 'profiles')
          return profilesQuery
        throw new Error(`Unexpected table: ${table}`)
      },
    } as any

    const res = await listAdminOrders(supabase, {
      q: 'ord-zzzz9999',
      status: '',
      createdFrom: '',
      createdTo: '',
      page: 1,
      perPage: 25,
      sortBy: 'created_at',
      sortOrder: 'desc',
    })

    expect(orderCapture.eq).toContainEqual(['order_number', 'ORD-ZZZZ9999'])
    expect(res.items[0].member_name).toBe('User Three')
    expect(res.items[0].member_email).toBe('u3@test.com')
  })
})
