import PropTypes from "prop-types";
import {
  FileText,
  ClipboardList,
  Clock,
  Laptop,
  Building2,
  ShieldAlert,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Utensils,
  Stethoscope,
  Sparkles,
  ArrowRightLeft,
  Users,
  FolderOpen,
  ListChecks,
  Hospital,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const categoryGroups = [
  {
    id: "politici_publice",
    title: "Politici publice",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    subcategories: [
      {
        id: "protocoale",
        title: "Protocoale",
        icon: ClipboardList,
      },
      {
        id: "program_lucru",
        title: "Program de lucru",
        icon: Clock,
      },
      {
        id: "birocratie_digitalizare",
        title: "Birocrație / digitalizare",
        icon: Laptop,
      },
      {
        id: "organizare_spitale",
        title: "Organizare spitale",
        icon: Building2,
      },
      {
        id: "nosocomiale",
        title: "Nosocomiale",
        icon: ShieldAlert,
      },
      {
        id: "programe_finantare",
        title: "Programe de finanțare",
        icon: DollarSign,
      },
      {
        id: "relatia_cnas",
        title: "Relația cu CNAS",
        icon: CreditCard,
      },
    ],
  },
  {
    id: "probleme_spitale",
    title: "Probleme din spitale",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    subcategories: [
      {
        id: "hrana",
        title: "Hrană",
        icon: Utensils,
      },
      {
        id: "calitate_act_medical",
        title: "Calitatea actului medical",
        icon: Stethoscope,
      },
      {
        id: "curatenie",
        title: "Curățenie",
        icon: Sparkles,
      },
      {
        id: "transferuri_fortate",
        title: "Transferuri forțate către privat",
        icon: ArrowRightLeft,
      },
      {
        id: "management",
        title: "Management",
        icon: Users,
      },
    ],
  },
  {
    id: "programe_nationale",
    title: "Programele naționale de sănătate",
    icon: FolderOpen,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    subcategories: [
      {
        id: "lista_boli_cronice",
        title: "Lista categoriilor de pacienți cu boli cronice",
        icon: ListChecks,
      },
      {
        id: "acces_servicii",
        title: "Accesul direct la servicii de sănătate",
        icon: Hospital,
      },
    ],
  },
];

export default function CategoryCards({ onSelectCategory }) {
  const handleSubcategoryClick = (group, subcategory) => {
    onSelectCategory({
      ...subcategory,
      groupTitle: group.title,
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Accordion type="single" collapsible className="space-y-4">
        {categoryGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <AccordionItem
              key={group.id}
              value={group.id}
              className="border border-gray-200 rounded-xl bg-white overflow-hidden"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${group.bgColor}`}>
                    <GroupIcon className={`w-5 h-5 ${group.color}`} />
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {group.title}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-2 pt-2">
                  {group.subcategories.map((subcategory) => {
                    const SubIcon = subcategory.icon;
                    return (
                      <button
                        key={subcategory.id}
                        onClick={() =>
                          handleSubcategoryClick(group, subcategory)
                        }
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                      >
                        <SubIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        <span className="text-gray-700 group-hover:text-gray-900">
                          {subcategory.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

CategoryCards.propTypes = {
  onSelectCategory: PropTypes.func.isRequired,
};
