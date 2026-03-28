export const mockTransaction = {
  type: 'expense' as const,
  amount: 35.5,
  category: '生鲜',
  note: '买菜',
};

export const mockIncome = {
  type: 'income' as const,
  amount: 5000,
  category: '工资',
  note: '月薪',
};
