export type TxnType = 'income' | 'expense';

export type Profile = { id: string; name: string; currency: string; created_at: string };

export type Account = {
  id: string;
  profile_id: string;
  name: string;
  start_balance: number;
  color: string;
  // Position in the accounts list, smallest first. Changed by dragging.
  sort_order: number;
  created_at: string;
};

export type Category = {
  id: string;
  profile_id: string;
  name: string;
  type: TxnType;
  color: string;
  created_at: string;
};

export type Txn = {
  id: string;
  profile_id: string;
  account_id: string;
  type: TxnType;
  amount: number;
  category_id: string | null;
  // The remark typed by the user. (The database column is still called memo.)
  memo: string;
  // When the transaction starts counting. In the future = upcoming.
  occurs_at: string;
  done_at: string | null;
  created_at: string;
};

export type Data = {
  profiles: Profile[];
  accounts: Account[];
  categories: Category[];
  transactions: Txn[];
};

export type Table = keyof Data;
