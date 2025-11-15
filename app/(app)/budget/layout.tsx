import BudgetHeader from "@/components/nav/BudgetHeader";

export default function BudgetLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <BudgetHeader />
      <section className="pt-24">{children}</section>
    </>
  );
}
