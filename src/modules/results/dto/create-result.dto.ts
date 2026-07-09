export class CreateParameterResultDto {
  parameterId!: string;
  value!: string;
}

export class CreateTestResultDto {
  bookingId!: string;
  testId!: string;
  parameters!: CreateParameterResultDto[];
}
