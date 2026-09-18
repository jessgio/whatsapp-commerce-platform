import { Controller, Get, Query, StreamableFile, UseGuards } from "@nestjs/common";
import { ApiKeyGuard } from "../auth/api-key.guard";
import { CustomersService } from "./customers.service";
import {
  customerExportFilename,
  type CustomerExportSource,
} from "./export-xlsx";

function parseSource(raw: string | undefined): CustomerExportSource {
  if (raw === "internal" || raw === "voucher" || raw === "form_digital") {
    return raw;
  }
  return "all";
}

@Controller("customers")
@UseGuards(ApiKeyGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  async list() {
    return this.customers.list();
  }

  @Get("export")
  async export(@Query("source") sourceRaw: string | undefined) {
    const source = parseSource(sourceRaw);
    const buffer = await this.customers.exportXlsx(source);
    const filename = customerExportFilename(source);
    return new StreamableFile(buffer, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
