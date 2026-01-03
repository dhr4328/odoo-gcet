import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Download, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface SalaryData {
  grossSalary: number;
  deductions: number;
  netSalary: number;
  lastPaidDate: string;
  nextPayDate: string;
  payrollId?: string;
}

export function SalaryOverview() {
  const { user } = useAuth();
  const [salaryData, setSalaryData] = useState<SalaryData>({
    grossSalary: 0,
    deductions: 0,
    netSalary: 0,
    lastPaidDate: "N/A",
    nextPayDate: "N/A",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSalaryData = async () => {
      if (!user?.employeeId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch latest payroll record
        const data = await api.get(`/api/payroll/employee/${user.employeeId}`);
        const records = data.data?.records || [];
        
        if (records.length > 0) {
          // Get the most recent payroll record
          const latest = records[0];
          
          const grossSalary = latest.grossSalary || 0;
          const deductions = latest.deductions?.total || latest.deductions || 0;
          const netSalary = latest.netSalary || 0;
          
          // Calculate last paid date
          let lastPaidDate = "N/A";
          if (latest.status === "paid" && latest.paidAt) {
            try {
              lastPaidDate = format(new Date(latest.paidAt), "MMM d, yyyy");
            } catch {
              lastPaidDate = latest.paidAt;
            }
          } else if (latest.payPeriod) {
            // Use pay period if paid date not available
            try {
              const [year, month] = latest.payPeriod.split("-");
              const date = new Date(parseInt(year), parseInt(month) - 1, 1);
              lastPaidDate = format(date, "MMM yyyy");
            } catch {
              lastPaidDate = latest.payPeriod;
            }
          }
          
          // Calculate next pay date (assuming monthly payroll)
          const now = new Date();
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          const nextPayDate = format(nextMonth, "MMM d, yyyy");
          
          setSalaryData({
            grossSalary,
            deductions,
            netSalary,
            lastPaidDate,
            nextPayDate,
            payrollId: latest._id || latest.id,
          });
        }
      } catch (err) {
        console.error("Error fetching salary data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalaryData();
  }, [user?.employeeId]);

  const handleViewPayslip = async () => {
    if (!salaryData.payrollId) return;
    
    try {
      const data = await api.get(`/api/payroll/slip/${salaryData.payrollId}`);
      // Open payslip in new window or show in dialog
      window.open(`/payroll?payslip=${salaryData.payrollId}`, "_blank");
    } catch (err) {
      console.error("Error fetching payslip:", err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-accent" />
          Salary Overview
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleViewPayslip}
          disabled={!salaryData.payrollId || isLoading}
        >
          <Download className="h-4 w-4 mr-2" />
          Payslip
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : salaryData.netSalary === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No salary data available</p>
          </div>
        ) : (
        <div className="space-y-4">
          {/* Net Salary Highlight */}
          <div className="p-4 bg-accent/10 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Net Salary (Monthly)</p>
            <p className="text-3xl font-bold text-accent">
              {formatCurrency(salaryData.netSalary)}
            </p>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-accent" />
                <p className="text-xs text-muted-foreground">Gross Salary</p>
              </div>
              <p className="font-semibold">{formatCurrency(salaryData.grossSalary)}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-warning" />
                <p className="text-xs text-muted-foreground">Deductions</p>
              </div>
              <p className="font-semibold">-{formatCurrency(salaryData.deductions)}</p>
            </div>
          </div>

          {/* Pay Dates */}
          <div className="flex items-center justify-between pt-2 border-t text-sm">
            <div>
              <p className="text-muted-foreground">Last Paid</p>
              <p className="font-medium">{salaryData.lastPaidDate}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Next Pay</p>
              <p className="font-medium">{salaryData.nextPayDate}</p>
            </div>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
