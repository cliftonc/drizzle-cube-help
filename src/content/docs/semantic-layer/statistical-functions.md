---
title: Statistical & Window Functions
---

Drizzle Cube supports advanced statistical functions and window functions for analytics workloads. These measures enable calculations like standard deviation, variance, percentiles, moving averages, and ranking functions.

## Database Support

Statistical and window function support varies by database. Drizzle Cube handles this gracefully - unsupported functions return `NULL` with a warning rather than crashing your queries.

| Function Type | PostgreSQL | MySQL 8.0+ | SQLite |
|---------------|------------|------------|--------|
| STDDEV (population/sample) | Full | Full | Not supported |
| VARIANCE (population/sample) | Full | Full | Not supported |
| PERCENTILE (median, P95, P99) | Full | Not supported | Not supported |
| Window Functions (LAG, LEAD, RANK, etc.) | Full | Full | SQLite 3.25+ |

## Statistical Measures

### Standard Deviation

Standard deviation measures the amount of variation in your data. Use `stddev` for population standard deviation or `stddevSamp` for sample standard deviation.

```typescript
import { defineCube } from 'drizzle-cube/server'

const ordersCube = defineCube('Orders', {
  sql: (ctx) => ({
    from: orders,
    where: eq(orders.organisationId, ctx.securityContext.organisationId)
  }),

  measures: {
    // Population standard deviation
    stddevAmount: {
      name: 'stddevAmount',
      title: 'Order Amount Std Dev',
      type: 'stddev',
      sql: () => orders.amount,
      description: 'Standard deviation of order amounts (population)'
    },

    // Sample standard deviation
    stddevSampAmount: {
      name: 'stddevSampAmount',
      title: 'Order Amount Std Dev (Sample)',
      type: 'stddevSamp',
      sql: () => orders.amount,
      description: 'Standard deviation of order amounts (sample)'
    },

    // Using statisticalConfig for sample vs population
    configuredStddev: {
      name: 'configuredStddev',
      title: 'Configured Std Dev',
      type: 'stddev',
      sql: () => orders.amount,
      statisticalConfig: {
        useSample: true  // Use sample standard deviation
      }
    }
  }
})
```

**When to use which:**
- **Population (`stddev`)**: When your data represents the entire population you're analyzing
- **Sample (`stddevSamp`)**: When your data is a sample of a larger population

### Variance

Variance measures the spread of data points. It's the square of the standard deviation.

```typescript
measures: {
  // Population variance
  varianceAmount: {
    name: 'varianceAmount',
    title: 'Order Amount Variance',
    type: 'variance',
    sql: () => orders.amount,
    description: 'Variance of order amounts (population)'
  },

  // Sample variance
  varianceSampAmount: {
    name: 'varianceSampAmount',
    title: 'Order Amount Variance (Sample)',
    type: 'varianceSamp',
    sql: () => orders.amount,
    description: 'Variance of order amounts (sample)'
  },

  // Using statisticalConfig
  configuredVariance: {
    name: 'configuredVariance',
    title: 'Configured Variance',
    type: 'variance',
    sql: () => orders.amount,
    statisticalConfig: {
      useSample: true
    }
  }
}
```

### Percentiles

Percentiles help you understand data distribution. Drizzle Cube provides convenient shortcuts for common percentiles plus a configurable percentile type.

```typescript
measures: {
  // Median (P50) - middle value
  medianAmount: {
    name: 'medianAmount',
    title: 'Median Order Amount',
    type: 'median',
    sql: () => orders.amount,
    description: 'The middle value of all order amounts'
  },

  // 95th percentile - useful for SLA monitoring
  p95ResponseTime: {
    name: 'p95ResponseTime',
    title: 'P95 Response Time',
    type: 'p95',
    sql: () => requests.responseTime,
    description: '95% of requests complete within this time'
  },

  // 99th percentile - tail latency
  p99ResponseTime: {
    name: 'p99ResponseTime',
    title: 'P99 Response Time',
    type: 'p99',
    sql: () => requests.responseTime,
    description: '99% of requests complete within this time'
  },

  // Custom percentile (any value 0-100)
  p75Amount: {
    name: 'p75Amount',
    title: '75th Percentile Amount',
    type: 'percentile',
    sql: () => orders.amount,
    statisticalConfig: {
      percentile: 75  // Custom percentile value
    }
  },

  // Quartiles for box plots
  q1Amount: {
    name: 'q1Amount',
    title: 'Q1 (25th percentile)',
    type: 'percentile',
    sql: () => orders.amount,
    statisticalConfig: { percentile: 25 }
  },

  q3Amount: {
    name: 'q3Amount',
    title: 'Q3 (75th percentile)',
    type: 'percentile',
    sql: () => orders.amount,
    statisticalConfig: { percentile: 75 }
  }
}
```

## Window Functions

Window functions perform calculations across rows related to the current row. They're useful for rankings, running totals, and comparing values across time periods.

### LAG and LEAD

Compare current values with previous or next values:

```typescript
measures: {
  // Previous day's value
  previousDayAmount: {
    name: 'previousDayAmount',
    title: 'Previous Day Amount',
    type: 'lag',
    sql: () => orders.amount,
    windowConfig: {
      partitionBy: ['customerId'],  // Partition by customer
      orderBy: [{ field: 'date', direction: 'asc' }],
      offset: 1,  // 1 row back
      defaultValue: 0  // Return 0 if no previous row
    }
  },

  // Next day's value (look ahead)
  nextDayAmount: {
    name: 'nextDayAmount',
    title: 'Next Day Amount',
    type: 'lead',
    sql: () => orders.amount,
    windowConfig: {
      partitionBy: ['customerId'],
      orderBy: [{ field: 'date', direction: 'asc' }],
      offset: 1,
      defaultValue: null
    }
  },

  // Compare to 7 days ago
  weekAgoAmount: {
    name: 'weekAgoAmount',
    title: 'Week Ago Amount',
    type: 'lag',
    sql: () => orders.amount,
    windowConfig: {
      orderBy: [{ field: 'date', direction: 'asc' }],
      offset: 7
    }
  }
}
```

### Ranking Functions

Rank rows within partitions:

```typescript
measures: {
  // Standard ranking (gaps after ties)
  salesRank: {
    name: 'salesRank',
    title: 'Sales Rank',
    type: 'rank',
    windowConfig: {
      partitionBy: ['region'],
      orderBy: [{ field: 'totalSales', direction: 'desc' }]
    }
  },

  // Dense ranking (no gaps after ties)
  denseRank: {
    name: 'denseRank',
    title: 'Dense Rank',
    type: 'denseRank',
    windowConfig: {
      partitionBy: ['category'],
      orderBy: [{ field: 'revenue', direction: 'desc' }]
    }
  },

  // Row number (unique for each row)
  rowNum: {
    name: 'rowNum',
    title: 'Row Number',
    type: 'rowNumber',
    windowConfig: {
      orderBy: [{ field: 'createdAt', direction: 'asc' }]
    }
  },

  // Divide into quartiles
  quartile: {
    name: 'quartile',
    title: 'Performance Quartile',
    type: 'ntile',
    windowConfig: {
      partitionBy: ['department'],
      orderBy: [{ field: 'performance', direction: 'desc' }],
      nTile: 4  // Divide into 4 groups
    }
  }
}
```

### Moving Averages and Sums

Calculate rolling aggregations:

```typescript
measures: {
  // 7-day moving average
  movingAvg7Day: {
    name: 'movingAvg7Day',
    title: '7-Day Moving Average',
    type: 'movingAvg',
    sql: () => orders.amount,
    windowConfig: {
      partitionBy: ['productId'],
      orderBy: [{ field: 'date', direction: 'asc' }],
      frame: {
        type: 'rows',
        start: 6,  // 6 preceding rows
        end: 'current'  // Current row
      }
    }
  },

  // 30-day moving sum
  movingSum30Day: {
    name: 'movingSum30Day',
    title: '30-Day Rolling Total',
    type: 'movingSum',
    sql: () => orders.amount,
    windowConfig: {
      orderBy: [{ field: 'date', direction: 'asc' }],
      frame: {
        type: 'rows',
        start: 29,
        end: 'current'
      }
    }
  },

  // Running total (cumulative sum)
  runningTotal: {
    name: 'runningTotal',
    title: 'Running Total',
    type: 'movingSum',
    sql: () => orders.amount,
    windowConfig: {
      orderBy: [{ field: 'date', direction: 'asc' }],
      frame: {
        type: 'rows',
        start: 'unbounded',  // From beginning
        end: 'current'
      }
    }
  }
}
```

### First and Last Values

Get the first or last value in a window:

```typescript
measures: {
  // First order amount in the period
  firstOrderAmount: {
    name: 'firstOrderAmount',
    title: 'First Order Amount',
    type: 'firstValue',
    sql: () => orders.amount,
    windowConfig: {
      partitionBy: ['customerId'],
      orderBy: [{ field: 'date', direction: 'asc' }]
    }
  },

  // Most recent order amount
  lastOrderAmount: {
    name: 'lastOrderAmount',
    title: 'Last Order Amount',
    type: 'lastValue',
    sql: () => orders.amount,
    windowConfig: {
      partitionBy: ['customerId'],
      orderBy: [{ field: 'date', direction: 'asc' }],
      frame: {
        type: 'rows',
        start: 'unbounded',
        end: 'unbounded'  // Include all rows to get true last
      }
    }
  }
}
```

## Window Configuration Reference

The `windowConfig` object supports these options:

```typescript
interface WindowConfig {
  // Columns to partition by (similar to GROUP BY for window)
  partitionBy?: string[]

  // How to order rows within each partition
  orderBy?: Array<{
    field: string
    direction: 'asc' | 'desc'
  }>

  // For LAG/LEAD: number of rows to offset
  offset?: number

  // For LAG/LEAD: default value when offset is out of bounds
  defaultValue?: any

  // For NTILE: number of buckets
  nTile?: number

  // Frame specification for moving aggregates
  frame?: {
    type: 'rows' | 'range'
    start: number | 'unbounded'
    end: number | 'current' | 'unbounded'
  }
}
```

## Graceful Degradation

When a statistical function isn't supported by your database, Drizzle Cube handles it gracefully:

1. **Logs a warning** to the console: `[drizzle-cube] stddev not supported on sqlite, returning NULL`
2. **Returns NULL** for that measure
3. **Continues executing** the rest of the query

This means your queries won't crash - they'll just have `NULL` values for unsupported measures.

### Checking Database Capabilities

You can check what your database supports:

```typescript
import { createDatabaseExecutor } from 'drizzle-cube/server'

const executor = createDatabaseExecutor(db, schema)
const capabilities = executor.databaseAdapter.getCapabilities()

console.log(capabilities)
// {
//   supportsStddev: true,
//   supportsVariance: true,
//   supportsPercentile: true,
//   supportsWindowFunctions: true,
//   supportsFrameClause: true
// }
```

### Conditional Measure Definitions

You can conditionally define measures based on capabilities:

```typescript
const capabilities = executor.databaseAdapter.getCapabilities()

const measures: Record<string, any> = {
  count: {
    name: 'count',
    type: 'count',
    sql: () => table.id
  }
}

// Only add percentile measures if supported
if (capabilities.supportsPercentile) {
  measures.medianAmount = {
    name: 'medianAmount',
    type: 'median',
    sql: () => table.amount
  }
}

const cube = defineCube('Orders', {
  sql: (ctx) => ({ from: table, where: eq(table.orgId, ctx.securityContext.organisationId) }),
  measures
})
```

## Database-Specific SQL Generated

### PostgreSQL

```sql
-- STDDEV
SELECT COALESCE(STDDEV_POP(amount), 0) AS "stddevAmount" FROM orders

-- VARIANCE
SELECT COALESCE(VAR_SAMP(amount), 0) AS "varianceAmount" FROM orders

-- PERCENTILE
SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) AS "p95ResponseTime"

-- Window function (LAG)
SELECT LAG(amount, 1, 0) OVER (PARTITION BY customer_id ORDER BY date ASC) AS "previousDayAmount"

-- Moving average
SELECT AVG(amount) OVER (ORDER BY date ASC ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS "movingAvg7Day"
```

### MySQL 8.0+

```sql
-- STDDEV (uses IFNULL instead of COALESCE)
SELECT IFNULL(STDDEV_POP(amount), 0) AS `stddevAmount` FROM orders

-- VARIANCE
SELECT IFNULL(VAR_SAMP(amount), 0) AS `varianceAmount` FROM orders

-- Window functions work the same as PostgreSQL
SELECT LAG(amount, 1, 0) OVER (PARTITION BY customer_id ORDER BY date ASC) AS `previousDayAmount`
```

### SQLite

```sql
-- Statistical functions return NULL (not supported)
SELECT MAX(NULL) AS "stddevAmount" FROM orders

-- Window functions ARE supported (SQLite 3.25+)
SELECT LAG(amount, 1, 0) OVER (PARTITION BY customer_id ORDER BY date ASC) AS "previousDayAmount"
```

## Use Cases

### SLA Monitoring

```typescript
measures: {
  p50ResponseTime: { type: 'median', sql: () => requests.responseTime },
  p95ResponseTime: { type: 'p95', sql: () => requests.responseTime },
  p99ResponseTime: { type: 'p99', sql: () => requests.responseTime },
  stddevResponseTime: { type: 'stddev', sql: () => requests.responseTime }
}
```

### Financial Analysis

```typescript
measures: {
  avgDailyVolume: { type: 'avg', sql: () => trades.volume },
  volatility: { type: 'stddev', sql: () => trades.priceChange },
  movingAvg20Day: {
    type: 'movingAvg',
    sql: () => trades.price,
    windowConfig: { orderBy: [{ field: 'date', direction: 'asc' }], frame: { type: 'rows', start: 19, end: 'current' } }
  }
}
```

### Sales Rankings

```typescript
measures: {
  salesRank: {
    type: 'rank',
    windowConfig: { partitionBy: ['region'], orderBy: [{ field: 'revenue', direction: 'desc' }] }
  },
  percentileRank: {
    type: 'percentile',
    sql: () => sales.revenue,
    statisticalConfig: { percentile: 90 }
  }
}
```

## Best Practices

1. **Check database support** before relying on statistical functions in production
2. **Use meaningful defaults** for LAG/LEAD when rows might not exist
3. **Consider performance** - window functions can be expensive on large datasets
4. **Test across databases** if you support multiple database backends
5. **Document measures** clearly since statistical measures can be complex

## Next Steps

- Learn about [Calculated Measures](/semantic-layer/calculated-measures) for custom formulas
- Explore [Time Dimensions](/semantic-layer/time-dimensions) for time-series analysis
- Review [Performance](/advanced/performance) tips for optimizing statistical queries
