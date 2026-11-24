export type TxnType = 'income' | 'expense';

export type Profile = { id: string; name: string; currency: string; created_at: string };

export type Account = {
  id: string;
  profile_id: string;
  name: string;
  start_balance: number;
  color: string;
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

export type Payee = { id: string; profile_id: string; name: string; created_at: string };

export type Txn = {
  id: string;
  profile_id: string;
  account_id: string;
  type: TxnType;
  amount: number;
  payee: string;
  category_id: string | null;
  check_num: string;
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
  payees: Payee[];
  transactions: Txn[];
};

export type Table = keyof Data;
