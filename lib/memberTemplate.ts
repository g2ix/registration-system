import * as XLSX from 'xlsx'

export const MEMBER_UPLOAD_TEMPLATE_FILENAME = 'member-upload-template.xlsx'

export const MEMBER_TEMPLATE_HEADERS = [
    'usccmpc_id',
    'firstName',
    'lastName',
    'middleName',
    'suffix',
    'membership_type',
    'email1',
    'email2',
    'contactNumber',
] as const

const SAMPLE_ROWS = [
    {
        usccmpc_id: 'USCC-0001',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        middleName: 'Santos',
        suffix: 'Jr.',
        membership_type: 'Regular',
        email1: 'juan@example.com',
        email2: '',
        contactNumber: '09171234567',
    },
    {
        usccmpc_id: 'USCC-0002',
        firstName: 'María',
        lastName: 'Nuñez',
        middleName: '',
        suffix: '',
        membership_type: 'Associate',
        email1: 'maria@example.com',
        email2: '',
        contactNumber: '09181234567',
    },
]

export function buildMemberUploadTemplate() {
    const members = XLSX.utils.json_to_sheet(SAMPLE_ROWS, {
        header: [...MEMBER_TEMPLATE_HEADERS],
    })
    members['!cols'] = MEMBER_TEMPLATE_HEADERS.map((header) => ({
        wch: Math.max(header.length + 2, 18),
    }))

    const instructions = XLSX.utils.aoa_to_sheet([
        ['Member upload template'],
        [''],
        ['Use the Members sheet. Replace the two sample rows before you upload.'],
        ['Required: usccmpc_id, firstName, lastName, membership_type'],
        ['membership_type must be Regular or Associate'],
        ['Optional: middleName, suffix, email1, email2, contactNumber'],
        ['This Instructions sheet is ignored on upload.'],
    ])
    instructions['!cols'] = [{ wch: 88 }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, members, 'Members')
    XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions')
    return workbook
}
