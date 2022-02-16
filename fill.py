import sys
from fillpdf import fillpdfs

print(sys.argv)
print(len(sys.argv))

old_pdf = sys.argv[7]
new_pdf = sys.argv[8]

values = {
            "Name" : sys.argv[1],
            "KST" : sys.argv[2],
            "Abteilung" : sys.argv[3],
            "Laptop Typ" : sys.argv[4],
            "SerienNr" : sys.argv[5],
            "Zub" : "",
            "DatumR1" : sys.argv[6],
            "DatumR" : sys.argv[6],
            "Datum2" : sys.argv[6],
            
            #Nur bei Rückgabe 
            "DatumR2" : ""
}


print(values)
print(old_pdf)
print(new_pdf)

fillpdfs.get_form_fields(old_pdf)




fillpdfs.write_fillable_pdf(old_pdf, new_pdf, values)