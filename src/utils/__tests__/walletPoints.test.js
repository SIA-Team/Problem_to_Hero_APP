import {
  applyWalletPointsBalanceDelta,
  extractWalletTransactionRows,
  getWalletTransactionUniqueKey,
  mergeLocalWalletTransactions,
  matchesWalletTransactionFilters,
  normalizeWalletPointsOverview,
  normalizeWalletServerOverview,
  normalizeWalletServerTransactionResponse,
  normalizeWalletPointsTxnListParams,
  roundWalletPointsAmount,
  summarizeWalletTransactions,
  WALLET_POINTS_DEFAULT_CURRENCY,
} from '../walletPoints';

describe('walletPoints utilities', () => {
  it('normalizes txn-list query params with documented fields only', () => {
    expect(
      normalizeWalletPointsTxnListParams({
        direction: 'credit',
        sourceType: 'topup',
        startTime: '2025-12-01 00:00:00',
        pageNum: '2',
        pageSize: '10',
        unsupported: 'ignored',
      })
    ).toEqual({
      direction: 'CREDIT',
      sourceType: 'TOPUP',
      startTime: '2025-12-01 00:00:00',
      pageNum: 2,
      pageSize: 10,
    });
  });

  it('drops invalid txn-list filter values', () => {
    expect(
      normalizeWalletPointsTxnListParams({
        direction: 'unknown',
        sourceType: 'invalid',
        startTime: '   ',
        pageNum: 0,
        pageSize: -1,
      })
    ).toEqual({});
  });

  it('extracts txn-list rows from top-level responses', () => {
    expect(
      extractWalletTransactionRows({
        code: 200,
        total: 2,
        rows: [{ txnNo: 'A' }, { txnNo: 'B' }],
      })
    ).toEqual({
      total: 2,
      rows: [{ txnNo: 'A' }, { txnNo: 'B' }],
    });
  });

  it('extracts txn-list rows from nested data responses', () => {
    expect(
      extractWalletTransactionRows({
        code: 200,
        data: {
          total: 1,
          rows: [{ txnNo: 'A' }],
        },
      })
    ).toEqual({
      total: 1,
      rows: [{ txnNo: 'A' }],
    });
  });

  it('summarizes income and expense using direction plus positive amount', () => {
    expect(
      summarizeWalletTransactions([
        { txnNo: '1', direction: 'CREDIT', amount: 100 },
        { txnNo: '2', direction: 'DEBIT', amount: 40 },
        { txnNo: '3', direction: 'credit', amount: '10' },
        { txnNo: '4', direction: 'UNKNOWN', amount: 999 },
      ])
    ).toEqual({
      income: 110,
      expense: 40,
    });
  });

  it('normalizes wallet overview fields with USD default', () => {
    expect(
      normalizeWalletPointsOverview({
        balance: '1000',
        withdrawableBalance: 800,
        lockedBalance: '200',
        frozenBalance: null,
      })
    ).toEqual({
      balance: 1000,
      withdrawableBalance: 800,
      lockedBalance: 200,
      frozenBalance: 0,
      currency: WALLET_POINTS_DEFAULT_CURRENCY,
    });
  });

  it('converts server wallet overview amounts from cents to dollars when values are clearly minor units', () => {
    expect(
      normalizeWalletServerOverview({
        balance: 12345,
        withdrawableBalance: 10000,
        lockedBalance: 2345,
        frozenBalance: 0,
        currency: 'USD',
      })
    ).toEqual({
      balance: 123.45,
      withdrawableBalance: 100,
      lockedBalance: 23.45,
      frozenBalance: 0,
      currency: 'USD',
    });
  });

  it('preserves server wallet overview amounts that are already major-unit decimals', () => {
    expect(
      normalizeWalletServerOverview({
        balance: '12.34',
        withdrawableBalance: '10.00',
        lockedBalance: '2.34',
        frozenBalance: 0,
        currency: 'USD',
      })
    ).toEqual({
      balance: 12.34,
      withdrawableBalance: 10,
      lockedBalance: 2.34,
      frozenBalance: 0,
      currency: 'USD',
    });
  });

  it('converts small server transaction amounts when the response explicitly marks minor units', () => {
    expect(
      normalizeWalletServerTransactionResponse({
        code: 200,
        data: {
          amountUnit: 'cent',
          total: 2,
          rows: [
            { txnNo: 'A', amount: 50 },
            { txnNo: 'B', amount: 125 },
          ],
        },
      })
    ).toEqual({
      code: 200,
      data: {
        amountUnit: 'cent',
        total: 2,
        rows: [
          { txnNo: 'A', amount: 0.5 },
          { txnNo: 'B', amount: 1.25 },
        ],
      },
    });
  });

  it('applies local wallet balance delta on top of overview values', () => {
    expect(
      applyWalletPointsBalanceDelta(
        {
          balance: 10,
          withdrawableBalance: 8,
          lockedBalance: 2,
          frozenBalance: 0,
        },
        -2.345
      )
    ).toEqual({
      balance: 7.66,
      withdrawableBalance: 5.66,
      lockedBalance: 2,
      frozenBalance: 0,
      currency: WALLET_POINTS_DEFAULT_CURRENCY,
    });
  });

  it('matches wallet transaction filters using normalized enums', () => {
    expect(
      matchesWalletTransactionFilters(
        { direction: 'debit', sourceType: 'bounty' },
        { direction: 'DEBIT', sourceType: 'BOUNTY' }
      )
    ).toBe(true);

    expect(
      matchesWalletTransactionFilters(
        { direction: 'credit', sourceType: 'topup' },
        { direction: 'DEBIT' }
      )
    ).toBe(false);
  });

  it('prepends unique local wallet transactions to the first page result', () => {
    expect(
      mergeLocalWalletTransactions(
        {
          total: 2,
          rows: [
            { txnNo: 'REMOTE-1', direction: 'DEBIT', sourceType: 'BOUNTY', amount: 5 },
            { txnNo: 'REMOTE-2', direction: 'CREDIT', sourceType: 'TOPUP', amount: 10 },
          ],
        },
        [
          { txnNo: 'LOCAL-1', direction: 'DEBIT', sourceType: 'BOUNTY', amount: 2 },
          { txnNo: 'REMOTE-1', direction: 'DEBIT', sourceType: 'BOUNTY', amount: 5 },
        ],
        { direction: 'DEBIT' }
      )
    ).toEqual({
      total: 3,
      rows: [
        { txnNo: 'LOCAL-1', direction: 'DEBIT', sourceType: 'BOUNTY', amount: 2 },
        { txnNo: 'REMOTE-1', direction: 'DEBIT', sourceType: 'BOUNTY', amount: 5 },
        { txnNo: 'REMOTE-2', direction: 'CREDIT', sourceType: 'TOPUP', amount: 10 },
      ],
    });
  });

  it('builds stable transaction keys from official identifiers', () => {
    expect(
      getWalletTransactionUniqueKey({
        txnNo: 'PTS20251225100000001',
        refType: 'topup_order',
        refId: '1001',
      })
    ).toBe('PTS20251225100000001');

    expect(
      getWalletTransactionUniqueKey({
        refType: 'withdraw_order',
        refId: '1002',
      })
    ).toBe('withdraw_order:1002');
  });

  it('rounds wallet amounts to two decimals consistently', () => {
    expect(roundWalletPointsAmount(12.3456)).toBe(12.35);
    expect(roundWalletPointsAmount('invalid')).toBe(0);
  });
});
